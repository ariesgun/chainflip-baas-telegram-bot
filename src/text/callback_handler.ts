import { Context } from "telegraf";
import {
  askQuote,
  buildInlineAssetsList,
  getAsset,
  getAssets,
  getStatus,
} from "../util";
import moment = require("moment");

const callback_handler = () => async (ctx: Context) => {
  let reply = "OK";
  let session = ctx["session"];

  console.log("Callback query", ctx);

  let state = session.state;
  const callback_query = ctx.update["callback_query"];
  console.log(callback_query.message);

  if (state === 0) {
    // Base token
    const asset = await getAsset(callback_query.data);
    session.source = asset;
  } else if (state === 1) {
    if (callback_query.data === "back") {
      session.state = -1;
    } else {
      // Destination
      const asset = await getAsset(callback_query.data);
      session.destination = asset;
    }
  } else if (state === 2) {
    if (callback_query.data === "proceed_swap") {
      session.state = 2;
    } else {
      session.state = -1;
    }
  } else if (state === 4) {
    if (callback_query.data === "complete") {
      session.state = 5;
    }
  } else if (state == 10) {
    // amount
  }

  state = session.state;
  let inline_keyboard = [];
  if (state == -1) {
    const assets = await getAssets();
    let inline_keyboard = buildInlineAssetsList(assets);

    await ctx.telegram.editMessageText(
      callback_query.message.chat.id,
      callback_query.message.message_id,
      undefined,
      "Please choose the base asset to swap from!",
      {
        reply_markup: { inline_keyboard },
      }
    );
    session.state = 0;
  } else if (state == 0) {
    reply = `OK. You have chosen *${session.source.ticker} (${session.source.network})* to swap from.\nThe minimum amount is *${session.source.minimalAmount} ${session.source.ticker}*.\n\nWhat is the amount you would like to swap?`;

    const assets = await getAssets();
    inline_keyboard = buildInlineAssetsList(assets);
    inline_keyboard.push([
      {
        text: "<< Back",
        callback_data: "back",
      },
    ]);
    session.state = 10;

    await ctx.telegram.editMessageText(
      callback_query.message.chat.id,
      callback_query.message.message_id,
      undefined,
      reply,
      {
        parse_mode: "Markdown",
      }
    );
  } else if (state == 1) {
    reply = `OK. Please wait for the quote ⌛...`;
    inline_keyboard = [];
    const quote = await askQuote(ctx);

    console.log("Quote", quote);
    session.quote = quote;

    await ctx.telegram.editMessageText(
      callback_query.message.chat.id,
      callback_query.message.message_id,
      undefined,
      reply
    );

    reply = `You've chosen to swap from *${session.source.ticker} (${session.source.network})* to *${session.destination.ticker} (${session.destination.network})*.\n\n`;
    reply += `Quote\n\t *${quote.ingressAmount} ${quote.ingressAsset}* ➡️ *${quote.egressAmount} ${quote.egressAsset}*\n\n`;
    reply += `Estimated Duration: ${quote.estimatedDurationSeconds} seconds.`;

    inline_keyboard.push([
      {
        text: "Proceed ✅",
        callback_data: "proceed_swap",
      },
    ]);
    inline_keyboard.push([
      {
        text: "Cancel 🔴",
        callback_data: "cancel_swap",
      },
    ]);

    session.state = 2;

    await ctx.telegram.editMessageText(
      callback_query.message.chat.id,
      callback_query.message.message_id,
      undefined,
      reply,
      {
        reply_markup: { inline_keyboard },
        parse_mode: "Markdown",
      }
    );
  } else if (state == 2) {
    // Ask for destination address
    await ctx.telegram.editMessageReplyMarkup(
      callback_query.message.chat.id,
      callback_query.message.message_id,
      undefined,
      { inline_keyboard }
    );

    reply = `OK. Please enter the destination address that will receive *${session.destination.ticker} (${session.destination.network})*`;
    await ctx.telegram.sendMessage(callback_query.message.chat.id, reply, {
      parse_mode: "Markdown",
    });

    session.state = 3;
  } else if (state == 5) {
    await ctx.telegram.editMessageReplyMarkup(
      callback_query.message.chat.id,
      callback_query.message.message_id,
      undefined,
      { inline_keyboard }
    );

    inline_keyboard = [
      [
        {
          text: "Refresh 🔃",
          callback_data: "refresh",
        },
      ],
    ];

    const status = await getStatus(ctx);
    reply = `Swap ID: ${status.id}\n`;
    reply += `Swap Status *${status.status.state}*\n\n`;
    reply += `⚠️ It can take a few minutes until the swap order is registered.\n\n`;
    reply += `Last Updated: ` + moment().format("YYYY-MM-DDThh:mm:ss.sssZ");
    await ctx.telegram.sendMessage(callback_query.message.chat.id, reply, {
      reply_markup: { inline_keyboard },
      parse_mode: "Markdown",
    });

    session.state = 6;
  } else if (state == 6) {
    inline_keyboard = [
      [
        {
          text: "Refresh 🔃",
          callback_data: "refresh",
        },
      ],
    ];

    const status = await getStatus(ctx);
    reply = `Swap ID: ${status.id}\n`;
    reply += `Swap Status *${status.status.state}*\n\n`;
    reply += `⚠️ It can take a few minutes until the swap order is registered.\n\n`;
    reply += `Last Updated: ` + moment().format("YYYY-MM-DDThh:mm:ss.sssZ");
    await ctx.telegram.editMessageText(
      callback_query.message.chat.id,
      callback_query.message.message_id,
      undefined,
      reply,
      {
        reply_markup: { inline_keyboard },
        parse_mode: "Markdown",
      }
    );
  }
};

export { callback_handler };
