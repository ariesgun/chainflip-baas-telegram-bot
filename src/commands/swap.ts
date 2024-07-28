import { Context } from "telegraf";
import { buildInlineAssetsList, getAssets } from "../util";

const swap = () => async (ctx: Context) => {
  console.log(ctx);

  const assets = await getAssets();
  let inline_keyboard = buildInlineAssetsList(assets);

  //   ctx["session"].state = 0;

  await ctx.telegram.sendMessage(
    ctx.message?.chat.id!,
    "Please choose the base asset to swap from!",
    {
      reply_markup: { inline_keyboard },
    }
  );
};

export { swap };
