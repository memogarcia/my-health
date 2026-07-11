// Transitional compatibility entry point. Database ownership now lives under
// the platform kernel; existing domain adapters can migrate without a big bang.
pub(crate) use crate::platform::database::*;
