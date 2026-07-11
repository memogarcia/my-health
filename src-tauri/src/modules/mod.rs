pub mod apple_health;
pub mod assistant;
pub mod conditions;
pub mod documents;
pub mod health_core;
pub mod labs;
pub mod lifestyle;
pub mod overview;
pub mod platform_pages;
pub mod regimen;
pub mod symptoms;

pub fn validate_catalog() -> Result<(), String> {
    crate::platform::module_registry::validate_catalog()
}
