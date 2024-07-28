import { Context } from "telegraf";
import { getAssets } from "../util";

const assets = () => async (ctx: Context) => {
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
};

export { assets };
