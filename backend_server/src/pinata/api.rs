use actix_web::web;

use crate::pinata::*;

pub async fn pinata_image_ipfs(
    bundle: web::Json<ImageContainer>,
) -> Result<String, Box<dyn std::error::Error>> {
    let boundary = "--------------------------970379464229125510173661";
    let mut payload = format!(
        "--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"file.png\"\r\nContent-Type: image/png\r\n\r\n",
    )
    .into_bytes();

    payload.extend(bundle.image.clone());
    payload.extend(format!("\r\n--{boundary}--\r\n").into_bytes());

    let client = reqwest::Client::new();

    let res = client
        .post("https://api.pinata.cloud/pinning/pinFileToIPFS")
        .header(
            "Content-Type",
            format!("multipart/form-data; boundary={}", boundary),
        )
        .header("Authorization", format!("Bearer {}", PINATA_API))
        .body(payload)
        .send()
        .await?;

    let body = res.text().await?;

    let body: IpFsPinata = serde_json::from_str(&body)?;

    println!("{:?}", body);

    Ok(body.IpfsHash)
}

pub async fn json_metadata_ipfs(
    bundle: web::Json<JsonMetaData>,
) -> Result<String, Box<dyn std::error::Error>> {
    println!("{:?}", bundle);
    let client = reqwest::Client::new();

    let res = client
        .post("https://api.pinata.cloud/pinning/pinJSONToIPFS")
        .header("Authorization", format!("Bearer {}", PINATA_API))
        .json(&bundle)
        .send()
        .await?;

    let body = res.text().await?;

    println!("{:?}", body);

    let body: IpFsPinata = serde_json::from_str(&body)?;

    Ok(body.IpfsHash)
}
