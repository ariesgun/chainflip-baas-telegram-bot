const chainflipBaseUrl = process.env.CHAINFLIP_BASEURL;
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
  const amount =
    Math.pow(10, ctx.session.source.decimals) * Number(ctx.session.amount);
  console.log(ctx.session.source.decimals);
  try {
    const res = await fetch(
      `${chainflipBaseUrl}/quote-native?apikey=${apiKey}&sourceAsset=${ctx.session.source.id}&destinationAsset=${ctx.session.destination.id}&amount=${amount}`
    );
    const data = await res.json();
    console.log(data);
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
