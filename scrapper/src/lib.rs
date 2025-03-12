use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::future_to_promise;
use js_sys::{Promise, Uint8Array};
use web_sys::console;

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub fn scrape_url(url: &str) -> Promise {
    let url = url.to_string();

    future_to_promise(async move {
        // Create a reqwest client with explicit error handling
        let client = match reqwest::Client::builder()
            .user_agent("wcag-scrapper/1.0")
            .build() {
                Ok(client) => client,
                Err(e) => {
                    let error_msg = format!("Failed to build client: {:?}", e);
                    console::error_1(&JsValue::from_str(&error_msg));
                    return Err(JsValue::from_str(&error_msg));
                }
            };

        // Send the HTTP request
        let response = match client.get(&url).send().await {
            Ok(resp) => resp,
            Err(e) => {
                let error_msg = format!("Request failed: {:?}", e);
                console::error_1(&JsValue::from_str(&error_msg));
                return Err(JsValue::from_str(&error_msg));
            }
        };

        // Check response status and get content
        if response.status().is_success() {
            match response.bytes().await {
                Ok(html_bytes) => {
                    let array = Uint8Array::new_with_length(html_bytes.len() as u32);
                    array.copy_from(&html_bytes);
                    Ok(array.into())
                },
                Err(e) => {
                    let error_msg = format!("Failed to get bytes: {:?}", e);
                    console::error_1(&JsValue::from_str(&error_msg));
                    Err(JsValue::from_str(&error_msg))
                }
            }
        } else {
            let error_msg = format!("HTTP error: {}", response.status());
            console::error_1(&JsValue::from_str(&error_msg));
            Err(JsValue::from_str(&error_msg))
        }
    })
}