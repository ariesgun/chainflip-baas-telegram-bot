import { Telegraf } from "telegraf";
import { session } from "telegraf-session-mongodb";

import { about, assets, status, swap, history } from "./commands";
import { callback_handler, greeting, text_handler } from "./text";
import { VercelRequest, VercelResponse } from "@vercel/node";
import { development, production } from "./core";
import { MongoClient } from "mongodb";

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const ENVIRONMENT = process.env.NODE_ENV || "";

const bot = new Telegraf(BOT_TOKEN);

const initialize = async () => {
  const db = (
    await MongoClient.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
  ).db();

  bot.use(session(db));

  bot.command("about", about());
  bot.command("status", status());
  bot.command("assets", assets());
  bot.command("swap", swap());
  bot.command("history", history());

  bot.on("callback_query", callback_handler());
  bot.on("message", text_handler());

  return bot;
};

initialize();

//prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
  await production(req, res, bot);
};

//dev mode
ENVIRONMENT !== "production" && development(bot);
