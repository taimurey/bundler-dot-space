pub fn pinata_api() -> String {
    dotenv::var("PINATA_API").expect("PINATA_API must be set")
}

pub const PINATA_API: &str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjNDc2YzEwMC00ZDViLTQ3YzQtYmNlNy0wOTQ0MDc3ODM3NDMiLCJlbWFpbCI6InRhaW1vb3JzaGFmaXF1ZTU0MUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJpZCI6IkZSQTEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX0seyJpZCI6Ik5ZQzEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiNDI3Yzc1MWFjYjU2MjYzZTczZjEiLCJzY29wZWRLZXlTZWNyZXQiOiIzYWQyMGFiZTQ3Y2U3Njg1MzhmMTNlOGQ4ZWFlZGRjMzEzZjlmMTY5YTI3ZTUxZjA5YThjZDJmMzJiYmVkMjEwIiwiaWF0IjoxNzIwNTAwMzgxfQ.k5RhP_yLlxWbMg63NXaUxeCJ2TdVyOOq-y2y_fPlNqM";

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
