use serde::Deserialize;

pub(super) const MAX_OUTPUT_CHARS: usize = 8_000;
pub(super) const MAX_RESEARCH_OUTPUT_CHARS: usize = 32_000;

#[derive(Clone, Copy, Default, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(super) enum LlmMode {
    #[default]
    Chat,
    Research,
}

#[derive(Clone, Copy)]
pub(super) struct LlmRequestOptions {
    pub(super) output_limit: usize,
    pub(super) max_tokens: usize,
}

impl LlmMode {
    pub(super) fn request_options(self) -> LlmRequestOptions {
        if self == Self::Research {
            LlmRequestOptions {
                output_limit: MAX_RESEARCH_OUTPUT_CHARS,
                max_tokens: 8_192,
            }
        } else {
            LlmRequestOptions {
                output_limit: MAX_OUTPUT_CHARS,
                max_tokens: 2_048,
            }
        }
    }
}
