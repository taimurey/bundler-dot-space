pub fn pinata_api() -> String {
    dotenv::var("PINATA_API").expect("PINATA_API must be set")
}

pub const PINATA_API: &str = "";

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct ImageContainer {
    pub image: Vec<u8>,
}

#[allow(non_snake_case)]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct IpFsPinata {
    pub IpfsHash: String,
    pub PinSize: u64,
    pub Timestamp: String,
    pub isDuplicate: Option<bool>,
}

// const TokenMetadata: any = {
//     "name": formData.coinname,
//     "symbol": formData.symbol,
//     "image": uploadedImageUrl,
//     "creator": {
//         "name": "Bundler Space",
//         "site": "https://bundler.space"
//     }
// };
// // Conditionally add description if it exists
// if (formData.tokenDescription) {
//     TokenMetadata.description = formData.tokenDescription;
// }

// // Directly add website, twitter, and telegram if they exist
// if (formData.websiteUrl) {
//     TokenMetadata.website = formData.websiteUrl;
// }
// if (formData.twitterUrl) {
//     TokenMetadata.twitter = formData.twitterUrl;
// }
// if (formData.telegramUrl) {
//     TokenMetadata.telegram = formData.telegramUrl;
// }

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct JsonMetaData {
    pub name: String,
    pub symbol: String,
    pub image: String,
    pub creator: Creator,
    pub description: Option<String>,
    pub website: Option<String>,
    pub twitter: Option<String>,
    pub telegram: Option<String>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Creator {
    pub name: String,
    pub site: String,
}
