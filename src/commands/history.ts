import { Context } from "telegraf";
import { getAssets, getStatusById } from "../util";
import Web3 from "web3";

const history = () => async (ctx: Context) => {
  const web3 = new Web3(Web3.givenProvider);
  try {
    const session = ctx["session"];
    const logs = session.history || [];

    let assets = ``;
    for (let idx = logs.length - 1; idx > logs.length - 10 && idx >= 0; idx--) {
      const status = await getStatusById(logs[idx]);

      assets += `SwapID ${status.id}: ${status.status.state}\n`;
      assets += ` ${status.status.srcAsset} ➡️ ${status.status.destAsset}\n`;

      if (status.status.ccmMetadata) {
        try {
          const decoded = web3.eth.abi.decodeParameters(
            ["string", "string"],
            status.status.ccmMetadata.message
          );
          assets += ` CCM: ` + decoded[1] + "\n\n";
        } catch (err) {
          assets += ` CCM: ` + "Unknown" + "\n\n";
        }
      }
    }

    let messages = "Transactions History:\n\n" + `${assets}`;

    await ctx.telegram.sendMessage(ctx.message.chat.id, messages);
  } catch (err) {
    console.log(err.message);
  }
};

export { history };
