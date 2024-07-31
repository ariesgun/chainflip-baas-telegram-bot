const { Telegraf } = require("telegraf");
const { message } = require("telegraf/filters");
const { session } = require("telegraf-session-mongodb");
const moment = require("moment");

const bot = new Telegraf(process.env.BOT_TOKEN);
const apiKey = process.env.CHAINFLIP_KEY;
const chainflipBaseUrl = process.env.CHAINFLIP_BASEURL;

const getAsset = async (asset_id) => {
  try {
    const res = await fetch(`${chainflipBaseUrl}/assets`);
    const data = await res.json();

    const asset = data.assets.filter((el) => el.id === asset_id);
    return asset[0];
  } catch (err) {
    console.log(err.message);
  }
};

const getAssets = async () => {
  try {
    const res = await fetch(`${chainflipBaseUrl}/assets`);
    const data = await res.json();
    return data.assets;
  } catch (err) {
    console.log(err.message);
  }
};

const buildInlineAssetsList = (assets) => {
  let inline_keyboard = [];
  let list_assets = [];
  console.log(assets);
  assets.forEach((asset, idx) => {
    list_assets.push({
      text: asset.ticker + " - " + asset.network,
      callback_data: asset.id,
    });
    if (idx % 2 == 1) {
      inline_keyboard.push(list_assets);
      list_assets = [];
    }
  });

  return inline_keyboard;
};

const askQuote = async (ctx) => {
  try {
    const res = await fetch(
      `${chainflipBaseUrl}/quote-native?apikey=${apiKey}&sourceAsset=${ctx.session.source.id}&destinationAsset=${ctx.session.destination.id}&amount=10000000000000000`
    );
    const data = await res.json();
    console.log(data);
    return data;
  } catch (err) {
    console.log(err.message);
  }
};

const startSwap = async (ctx) => {
  try {
    const res = await fetch(
      `${chainflipBaseUrl}/swap?apikey=${apiKey}&sourceAsset=${ctx.session.source.id}&destinationAsset=${ctx.session.destination.id}&destinationAddress=${ctx.session.destinationAddress}`
    );
    let data = await res.json();
    console.log(data);
    return data;
  } catch (err) {
    console.log(err.message);
  }
};

const getStatus = async (ctx) => {
  try {
    const res = await fetch(
      `${chainflipBaseUrl}/status-by-id/?apikey=${apiKey}&swapId=${ctx.session.swapId}`
    );
    console.log(
      "Hey",
      `${chainflipBaseUrl}/status-by-id/?apikey=${apiKey}&swapId=${ctx.session.swapId}`
    );
    const data = await res.json();
    console.log("Status", data);
    return data;
  } catch (err) {
    console.log(err.message);
  }
};

const setup = (db) => {
  // session middleware MUST be initialized
  // before any commands or actions that require sessions
  bot.use(session(db));

  bot.command("quit", async (ctx) => {
    // Explicit usage
    await ctx.telegram.leaveChat(ctx.message.chat.id);

    // Using context shortcut
    await ctx.leaveChat();
  });

  bot.command("swap", async (ctx) => {
    console.log(ctx);

    const assets = await getAssets();
    let inline_keyboard = buildInlineAssetsList(assets);

    ctx.session.state = 0;

    await ctx.telegram.sendMessage(
      ctx.message.chat.id,
      "Please choose the base asset to swap from!",
      {
        reply_markup: { inline_keyboard },
      }
    );
  });

  bot.command("assets", async (ctx) => {
    try {
      const data = await getAssets();

      let assets = ``;
      data.forEach((asset) => {
        assets += asset.ticker + ` \*` + asset.network + `*\n`;
      });

      let messages = "Here is the list of supported assets:\n\n" + `${assets}`;

      await ctx.telegram.sendMessage(ctx.message.chat.id, messages, {
        parse_mode: "MarkdownV2",
      });
    } catch (err) {
      console.log(err.message);
    }
  });

  bot.command("status", async (ctx) => {
    try {
      const data = await getAssets();

      let assets = ``;
      data.forEach((asset) => {
        assets += asset.ticker + ` \*` + asset.network + `*\n`;
      });

      let messages = "Here is the list of supported assets:\n\n" + `${assets}`;

      await ctx.telegram.sendMessage(ctx.message.chat.id, messages, {
        parse_mode: "MarkdownV2",
      });
    } catch (err) {
      console.log(err.message);
    }
  });

  bot.on("callback_query", async (ctx) => {
    // Explicit usage
    console.log("Callback query", ctx);
    console.log(ctx.update.callback_query.message);
    let reply = "OK";

    let state = ctx.session.state;
    const callback_query = ctx.update.callback_query;

    if (state === 0) {
      const asset = await getAsset(callback_query.data);
      ctx.session.source = asset;
    } else if (state === 1) {
      if (callback_query.data === "back") {
        ctx.session.state = -1;
      } else {
        // Destination
        const asset = await getDestinationAsset(callback_query.data);
        ctx.session.destination = asset;
      }
    } else if (state === 2) {
      if (callback_query.data === "proceed_swap") {
        ctx.session.state = 2;
      } else {
        ctx.session.state = -1;
      }
    } else if (state === 4) {
      if (callback_query.data === "complete") {
        ctx.session.state = 5;
      }
    }

    state = ctx.session.state;
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
      ctx.session.state = 0;
    } else if (state == 0) {
      reply = `OK. You have chosen *${ctx.session.source.ticker} (${ctx.session.source.network})* to swap from.\nNow please choose the asset to swap to.`;

      const assets = await getAssets();
      inline_keyboard = buildInlineAssetsList(assets);
      inline_keyboard.push([
        {
          text: "<< Back",
          callback_data: "back",
        },
      ]);
      ctx.session.state = 1;

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
    } else if (state == 1) {
      reply = `OK. Please wait for the quote ⌛...`;
      inline_keyboard = [];
      const quote = await askQuote(ctx);

      console.log("Quote", quote);
      ctx.session.quote = quote;

      await ctx.telegram.editMessageText(
        callback_query.message.chat.id,
        callback_query.message.message_id,
        undefined,
        reply
      );

      reply = `You've chosen to swap from *${ctx.session.source.ticker} (${ctx.session.source.network})* to *${ctx.session.destination.ticker} (${ctx.session.destination.network})*.\n\n`;
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

      ctx.session.state = 2;

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

      reply = `OK. Please enter the destination address that will receive *${ctx.session.destination.ticker} (${ctx.session.destination.network})*`;
      await ctx.telegram.sendMessage(callback_query.message.chat.id, reply, {
        parse_mode: "Markdown",
      });

      ctx.session.state = 3;
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

      ctx.session.state = 6;
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
  });

  bot.on("inline_query", async (ctx) => {
    const result = [];
    // Explicit usage
    await ctx.telegram.answerInlineQuery(ctx.inlineQuery.id, result);

    // Using context shortcut
    await ctx.answerInlineQuery(result);
  });

  bot.on(message("text"), async (ctx) => {
    // Explicit usage
    console.log(ctx.message);

    const state = ctx.session.state;
    if (state == 3) {
      ctx.session.destinationAddress = ctx.message.text;

      await ctx.telegram.sendMessage(
        ctx.message.chat.id,
        `OK. Chainflip is generating the *Deposit Address*.\nPlease wait for a moment. `,
        {
          parse_mode: "Markdown",
        }
      );

      const res = await startSwap(ctx);

      if (res.status && res.status != 200) {
        const reply = `Something is wrong.\nDetail*: ${res.detail}*`;
        await ctx.telegram.sendMessage(ctx.message.chat.id, reply, {
          parse_mode: "Markdown",
        });
        ctx.session.state = -1;
      } else {
        const quote = ctx.session.quote;
        reply = `
      
      ⚠️⚠️ Swap Information ⚠️⚠️

Swap Asset *${ctx.session.source.ticker} (${ctx.session.source.network})* ➡️ *${ctx.session.destination.ticker} (${ctx.session.destination.network})*
Deposit *${quote.ingressAmount} ${ctx.session.source.ticker}*
Receive *${quote.egressAmount} ${ctx.session.destination.ticker}*
Destination Address *${ctx.session.destinationAddress}*
      
Please transfer *${ctx.session.source.ticker}* to the following address on *${ctx.session.source.network}* network.
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

        ctx.session.swapId = res.id;
        if (ctx.session.history) {
          ctx.session.history.push(res.id);
        } else {
          ctx.session.history = [res.id];
        }
        ctx.session.state = 4;
      }
    } else {
      reply = `Hello ${ctx.from.first_name}`;
      await ctx.telegram.sendMessage(ctx.message.chat.id, reply, {
        parse_mode: "Markdown",
      });
    }
  });

  return bot;
};

module.exports = {
  setup,
};
