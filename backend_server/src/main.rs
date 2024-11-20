mod bundler_sender;
mod pinata;
mod sol_distributor;
mod utils;

use crate::bundler_sender::*;
use crate::pinata::*;
use actix_cors::Cors;
use actix_web::{error, http::header, web, App, HttpResponse, HttpServer, Responder};
use openssl::ssl::{SslAcceptor, SslFiletype, SslMethod};
use serde_json::json;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    pretty_env_logger::env_logger::builder()
        .filter_level(log::LevelFilter::Info)
        .init();

    let mut builder = SslAcceptor::mozilla_intermediate(SslMethod::tls()).unwrap();
    builder
        .set_private_key_file("mevarik-deployer_xyz_key.pem", SslFiletype::PEM)
        .unwrap();
    builder
        .set_certificate_chain_file("mevarik-deployer_xyz.pem")
        .unwrap();

    HttpServer::new(|| {
        let json_config = web::JsonConfig::default()
            .limit(20 * 1024 * 1024)
            .error_handler(|err, _req| {
                println!("Error deserializing JSON: {:?}", err);
                error::InternalError::from_response(err, HttpResponse::Conflict().finish()).into()
            });

        let cors = Cors::default()
            .allow_any_origin()
            .allowed_methods(vec!["GET", "POST"])
            .allowed_headers(vec![header::AUTHORIZATION, header::ACCEPT])
            .allowed_header(header::CONTENT_TYPE)
            .max_age(3600);

        App::new()
            .wrap(cors)
            .service(
                web::resource("/bundlesend")
                    .app_data(json_config.clone())
                    .route(web::post().to(bundler_router)),
            )
            .service(
                web::resource("/upload-image")
                    .app_data(json_config.clone())
                    .route(web::post().to(pinata_image_ipfs)),
            )
            .service(
                web::resource("/upload-json")
                    .app_data(json_config.clone())
                    .route(web::post().to(json_metadata_ipfs)),
            )
            .route("/", web::get().to(index))
    })
    //.bind("127.0.0.1:8080")?  -----------------> //  bind for Local Development
    .bind_openssl("0.0.0.0:8080", builder)?
    .run()
    .await
}

async fn index() -> impl Responder {
    let html = "<html><body><h1>Hello, world!</h1></body></html>";

    html
}

async fn bundler_router(bundle: web::Json<BundleData>) -> impl Responder {
    match bundler_sender(bundle).await {
        Ok(route) => HttpResponse::Ok().json(route),
        Err(e) => {
            println!("Error: {}", e);
            HttpResponse::InternalServerError().json(json!({"error": format!("{}", e)}))
        }
    }
}
