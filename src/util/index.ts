import Web3 from "web3";
import { assetsInfo } from "./assets_lut";

const chainflipBaseUrl = process.env.CHAINFLIP_BASEURL;
const thornodeBaseUrl = process.env.THORNODE_BASEURL;
const mayanodeBaseUrl = process.env.MAYANODE_BASEURL;
const cfreceiver_address = process.env.CFRECEIVER_ADDRESS;
const apiKey = process.env.CHAINFLIP_KEY;

export const getAssets = async () => {
  try {
    let all_assets = [];

    const res = await fetch(`${chainflipBaseUrl}/assets`);
    const data = await res.json();
    let assets = data.assets;
    assets = assets.map((el) => {
      el.broker = "chainflip";
      return el;
      // return (el.broker = "chainflip");
    });
    all_assets.push(...assets);

    console.log("All ", all_assets);

    return all_assets;
  } catch (err) {
    console.log(err.message);
  }
};

export const getDestinationAssets = async () => {
  try {
    let all_assets = [];
    {
      const res = await fetch(`${chainflipBaseUrl}/assets`);
      const data = await res.json();
      let assets = data.assets;
      assets = assets.map((el) => {
        el.broker = "chainflip";
        return el;
        // return (el.broker = "chainflip");
      });
      all_assets.push(...assets);
    }

    {
      const res = await fetch(`${thornodeBaseUrl}/pools`);
      let assets = await res.json();
      console.log("Assets ", assets);
      assets = assets.filter((el) => {
        return (
          el.status === "Available" &&
          [
            "GAIA.ATOM",
            "LTC.LTC",
            "AVAX.AVAX",
            "BCH.BCH",
            "BSC.BNB",
            "DOGE.DOGE",
          ].indexOf(el.asset) >= 0
        );
      });
      assets = assets.map((el) => {
        let temp = {};
        temp["id"] = el.asset;
        temp["ticker"] = el.asset.split(".")[1];
        temp["name"] = assetsInfo[el.asset].name;
        temp["network"] = assetsInfo[el.asset].network;
        temp["decimals"] = assetsInfo[el.asset].decimals;
        temp["broker"] = "thornode";
        return temp;
      });
      all_assets.push(...assets);
    }

    {
      const res = await fetch(`${mayanodeBaseUrl}/pools`);
      let assets = await res.json();
      console.log("Assets ", assets);
      assets = assets.filter((el) => {
        return ["KUJI.KUJI", "KUJI.USK", "THOR.RUNE"].indexOf(el.asset) >= 0;
      });
      assets = assets.map((el) => {
        let temp = {};
        temp["id"] = el.asset;
        temp["ticker"] = el.asset.split(".")[1];
        temp["name"] = assetsInfo[el.asset].name;
        temp["network"] = assetsInfo[el.asset].network;
        temp["decimals"] = assetsInfo[el.asset].decimals;
        temp["broker"] = "mayanode";
        return temp;
      });
      all_assets.push(...assets);

      const maya_cacao = {
        id: "MAYA.CACAO",
        ticker: "CACAO",
        name: "Cacao",
        network: "MayaChain",
        decimals: 8,
        broker: "mayanode",
      };

      all_assets.push(maya_cacao);
    }

    console.log("All ", all_assets);

    return all_assets;
  } catch (err) {
    console.log(err.message);
  }
};

export const getAsset = async (asset_id) => {
  try {
    const data = await getAssets();
    const asset = data.filter((el) => el.id === asset_id);
    return asset[0];
  } catch (err) {
    console.log(err.message);
  }
};

export const getDestinationAsset = async (asset_id) => {
  try {
    const data = await getDestinationAssets();
    const asset = data.filter((el) => el.id === asset_id);
    return asset[0];
  } catch (err) {
    console.log(err.message);
  }
};

export const buildInlineAssetsList = (assets) => {
  let inline_keyboard = [];
  let list_assets = [];

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

  if (list_assets.length > 0) {
    inline_keyboard.push(list_assets);
  }

  return inline_keyboard;
};

export const askQuote = async (ctx) => {
  console.log("Quote ", Number(ctx.session.amount));
  if (ctx.session.destination.broker === "chainflip") {
    const data = await askChainflipQuote(ctx);
    ctx.session.ccm = false;
    return data;
  } else if (ctx.session.destination.broker === "thornode") {
    const data = await askThorchainQuote(ctx);
    ctx.session.ccm = true;
    return data;
  } else if (ctx.session.destination.broker === "mayanode") {
    const data = await askMayanodeQuote(ctx);
    ctx.session.ccm = true;
    return data;
  } else {
    console.log("Unknown broker");
    throw new Error("Unknown broker");
  }
};

const askChainflipQuote = async (ctx) => {
  const amount =
    Math.pow(10, ctx.session.source.decimals) * Number(ctx.session.amount);
  try {
    const res = await fetch(
      `${chainflipBaseUrl}/quote-native?apikey=${apiKey}&sourceAsset=${ctx.session.source.id}&destinationAsset=${ctx.session.destination.id}&amount=${amount}`
    );
    const data = await res.json();
    console.log("Chainflip", data);
    return data;
  } catch (err) {
    console.log(err.message);
    throw err;
  }
};

const askThorchainQuote = async (ctx) => {
  const amount = Math.pow(10, 8) * Number(ctx.session.amount);
  const baseAsset = "ETH.ETH";
  try {
    const res = await fetch(
      `${thornodeBaseUrl}/quote/swap?from_asset=${baseAsset}&to_asset=${ctx.session.destination.id}&amount=${amount}`
    );
    const data = await res.json();
    console.log("Thornode", data);
    const output = {
      ingressAsset: ctx.session.source.name,
      ingressAmount: ctx.session.amount,
      egressAmount: data.expected_amount_out / Math.pow(10, 8),
      egressAsset: ctx.session.destination.name,
      estimatedDurationSeconds: data.total_swap_seconds + 180, // Add extra 3 minutes for CCM
    };

    return output;
  } catch (err) {
    console.log(err.message);
    throw err;
  }
};

const askMayanodeQuote = async (ctx) => {
  const amount = Math.pow(10, 8) * Number(ctx.session.amount);
  const baseAsset = "ETH.ETH";
  try {
    const res = await fetch(
      `${mayanodeBaseUrl}/quote/swap?from_asset=${baseAsset}&to_asset=${ctx.session.destination.id}&amount=${amount}`
    );
    const data = await res.json();
    console.log("Mayanode", data);
    const output = {
      ingressAsset: ctx.session.source.name,
      ingressAmount: ctx.session.amount,
      egressAmount: data.expected_amount_out / Math.pow(10, 8),
      egressAsset: ctx.session.destination.name,
      estimatedDurationSeconds: data.total_swap_seconds + 180, // Add extra 5 minutes for CCM
    };

    return output;
  } catch (err) {
    console.log(err.message);
    throw err;
  }
};

export const getThorchainMemo = async (ctx) => {
  const amount = Math.pow(10, 8) * Number(ctx.session.amount);
  const baseAsset = "ETH.ETH";
  try {
    const res = await fetch(
      `${thornodeBaseUrl}/quote/swap?from_asset=${baseAsset}&to_asset=${ctx.session.destination.id}&amount=${amount}&destination=${ctx.session.destinationAddress}`
    );
    const data = await res.json();
    console.log("Thornode", data);
    return data;
  } catch (err) {
    console.log(err.message);
    throw err;
  }
};

export const getMayanodeMemo = async (ctx) => {
  const amount = Math.pow(10, 8) * Number(ctx.session.amount);
  const baseAsset = "ETH.ETH";
  try {
    const res = await fetch(
      `${mayanodeBaseUrl}/quote/swap?from_asset=${baseAsset}&to_asset=${ctx.session.destination.id}&amount=${amount}&destination=${ctx.session.destinationAddress}`
    );
    const data = await res.json();
    console.log("Mayanode", data);
    return data;
  } catch (err) {
    console.log(err.message);
    throw err;
  }
};

export const startSwap = async (ctx) => {
  try {
    const res = await fetch(
      `${chainflipBaseUrl}/swap?apikey=${apiKey}&sourceAsset=${ctx.session.source.id}&destinationAsset=${ctx.session.destination.id}&destinationAddress=${ctx.session.destinationAddress}`
    );
    let data = await res.json();
    console.log(data);
    return data;
  } catch (err) {
    console.log(err.message);
    throw err;
  }
};

export const startAdvancedSwap = async (ctx, payload) => {
  try {
    const contractAddress = cfreceiver_address;
    console.log("Address", contractAddress);
    const assetDestination = "eth.eth";

    const web3 = new Web3(Web3.givenProvider);
    const inbound_address = payload.inbound_address;
    const memo = payload.memo;

    const encodedMemo = web3.eth.abi.encodeParameters(
      ["string", "string"],
      [inbound_address, memo]
    );
    console.log(
      "URL ",
      `${chainflipBaseUrl}/swap?apikey=${apiKey}&sourceAsset=${ctx.session.source.id}&destinationAsset=${assetDestination}&destinationAddress=${contractAddress}`
    );
    const res = await fetch(
      `${chainflipBaseUrl}/swap?apikey=${apiKey}&sourceAsset=${ctx.session.source.id}&destinationAsset=${assetDestination}&destinationAddress=${contractAddress}`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ccmPayload: {
            gas_budget: "1000000000000",
            message: encodedMemo,
          },
        }),
      }
    );
    let data = await res.json();
    console.log(data);
    return data;
  } catch (err) {
    console.log(err.message);
    throw err;
  }
};

export const getStatus = async (ctx) => {
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
    throw err;
  }
};

export const getStatusById = async (swapId) => {
  try {
    const res = await fetch(
      `${chainflipBaseUrl}/status-by-id/?apikey=${apiKey}&swapId=${swapId}`
    );
    const data = await res.json();

    return data;
  } catch (err) {
    throw err;
  }
};
