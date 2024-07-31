const chainflipBaseUrl = process.env.CHAINFLIP_BASEURL;
const thornodeBaseUrl = process.env.THORNODE_BASEURL;
const apiKey = process.env.CHAINFLIP_KEY;

export const getAssets = async () => {
  try {
    const res = await fetch(`${chainflipBaseUrl}/assets`);
    const data = await res.json();
    return data.assets;
  } catch (err) {
    console.log(err.message);
  }
};

export const getAsset = async (asset_id) => {
  try {
    const res = await fetch(`${chainflipBaseUrl}/assets`);
    const data = await res.json();

    const asset = data.assets.filter((el) => el.id === asset_id);
    return asset[0];
  } catch (err) {
    console.log(err.message);
  }
};

export const buildInlineAssetsList = (assets) => {
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

  if (list_assets.length > 0) {
    inline_keyboard.push(list_assets);
  }

  return inline_keyboard;
};

export const askQuote = async (ctx) => {
  console.log("Quote ", Number(ctx.session.amount));
  if (ctx.session.broker === "chainflip") {
    await askChainflipQuote(ctx);
  } else if (ctx.session.broker === "thornode") {
    await askThorchainQuote(ctx);
  } else {
    console.log("Unknown broker");
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
  }
};

const askThorchainQuote = async (ctx) => {
  const amount =
    Math.pow(10, ctx.session.source.decimals) * Number(ctx.session.amount);
  try {
    const res = await fetch(
      `${thornodeBaseUrl}/quote/swap?from_asset=${ctx.session.source.id}&to_asset=${ctx.session.destination.id}&amount=${amount}&destination=${ctx.session.destinationAddress}`
    );
    const data = await res.json();
    console.log("Thornode", data);
    return data;
  } catch (err) {
    console.log(err.message);
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
  }
};

export const startAdvancedSwap = async (ctx) => {
  try {
    const res = await fetch(
      `${chainflipBaseUrl}/swap?apikey=${apiKey}&sourceAsset=${ctx.session.source.id}&destinationAsset=${ctx.session.destination.id}&destinationAddress=${ctx.session.destinationAddress}`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ccmPayload: {
            gas_budget: "10000000000000",
            message: "0xdeadc0de",
          },
        }),
      }
    );
    let data = await res.json();
    console.log(data);
    return data;
  } catch (err) {
    console.log(err.message);
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
  }
};
