import { Context } from "telegraf";
import {
  buildInlineAssetsList,
  getAssets,
  startAdvancedSwap,
  startSwap,
} from "../util";

const text_handler = () => async (ctx: Context) => {
  console.log("text_handler", ctx);
  let session = ctx["session"];

  const state = session.state;
  if (state == 10) {
    session.amount = ctx.message["text"];

    const reply = `OK. You have chosen to swap *${session.amount} ${session.source.ticker} (${session.source.network})*.\Which asset would you like to swap to?`;

    const assets = await getAssets();
    const filteredAssets = assets.filter((el) => el.id !== session.source.id);
    let inline_keyboard = buildInlineAssetsList(filteredAssets);
    inline_keyboard.push([
      {
        text: "<< Back",
        callback_data: "back",
      },
    ]);
    session.state = 1;

    await ctx.telegram.sendMessage(ctx.message.chat.id, reply, {
      reply_markup: { inline_keyboard },
      parse_mode: "Markdown",
    });
  } else if (state == 3) {
    session.destinationAddress = ctx.message["text"];

    await ctx.telegram.sendMessage(
      ctx.message.chat.id,
      `OK. Chainflip is generating the *Deposit Address*.\nPlease wait for a moment. `,
      {
        parse_mode: "Markdown",
      }
    );

    // const res = await startSwap(ctx);
    const res = await startAdvancedSwap(ctx);

    if (res.status && res.status != 200) {
      const reply = `Something is wrong.\nDetail*: ${res.detail}*`;
      await ctx.telegram.sendMessage(ctx.message.chat.id, reply, {
        parse_mode: "Markdown",
      });
      session.state = -1;
    } else {
      const quote = session.quote;
      const reply = `
      
      ⚠️⚠️ Swap Information ⚠️⚠️

Swap Asset *${session.source.ticker} (${session.source.network})* ➡️ *${session.destination.ticker} (${session.destination.network})*
Deposit *${quote.ingressAmount} ${session.source.ticker}*
Receive *${quote.egressAmount} ${session.destination.ticker}*
Destination Address *${session.destinationAddress}*
      
Please transfer *${session.source.ticker}* to the following address on *${session.source.network}* network.
\`${res.address}\`
      
‼️ Please transfer to the deposit address within one hour or it will be expired
‼️ Explorer URL: [link](${res.explorerUrl})
      `;

      let inline_keyboard = [
        [
          {
            text: "Done ✅",
            callback_data: "complete",
          },
        ],
      ];

      await ctx.telegram.sendMessage(ctx.message.chat.id, reply, {
        reply_markup: { inline_keyboard },
        parse_mode: "Markdown",
      });

      session.swapId = res.id;
      if (session.history) {
        session.history.push(res.id);
      } else {
        session.history = [res.id];
      }
      session.state = 4;
    }
  } else {
    const reply = `Hello ${ctx.from.first_name}`;
    await ctx.telegram.sendMessage(ctx.message.chat.id, reply, {
      parse_mode: "Markdown",
    });
  }
};

export { text_handler };
