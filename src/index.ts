import { session, Telegraf } from "telegraf";

import { about, assets, status, swap } from "./commands";
import { callback_handler, greeting } from "./text";
import { VercelRequest, VercelResponse } from "@vercel/node";
import { development, production } from "./core";
import { MongoClient } from "mongodb";

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const ENVIRONMENT = process.env.NODE_ENV || "";

const initialize = async () => {
  const bot = new Telegraf(BOT_TOKEN);

  const db = (
    await MongoClient.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
  ).db();

  console.log("DB ", db, process.env.MONGODB_URI);

  bot.use(session(db));

  bot.command("about", about());
  bot.command("status", status());
  bot.command("assets", assets());
  bot.command("swap", swap());

  bot.on("callback_query", callback_handler());
  bot.on("message", greeting());

  //dev mode
  ENVIRONMENT !== "production" && development(bot);
};

initialize();

//prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
  const bot = new Telegraf(BOT_TOKEN);

  await production(req, res, bot);
};
