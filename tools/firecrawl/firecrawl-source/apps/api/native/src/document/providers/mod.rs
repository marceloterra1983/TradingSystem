use crate::document::model::Document;
use std::error::Error;

pub mod docx;
pub mod factory;
pub mod odt;
pub mod rtf;

pub trait DocumentProvider {
  fn parse_buffer(&self, data: &[u8]) -> Result<Document, Box<dyn Error + Send + Sync>>;

  #[allow(dead_code)]
  fn name(&self) -> &'static str;
}
