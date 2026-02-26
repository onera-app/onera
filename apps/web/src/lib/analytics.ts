/**
 * Centralized PostHog analytics module.
 *
 * All custom event tracking goes through here so event names stay
 * consistent and typed. PostHog autocapture handles pageviews and
 * generic clicks — this file is for *business-level* events only.
 *
 * Usage:
 *   import { analytics } from '@/lib/analytics'
 *   analytics.authSignIn({ provider: 'google' })
 */
import posthog from 'posthog-js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capture(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, properties);
}

/** Identify a user after auth so all subsequent events are attributed. */
function identify(userId: string, traits?: Record<string, unknown>) {
  posthog.identify(userId, traits);
}

/** Reset identity on sign-out. */
function reset() {
  posthog.reset();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const auth = {
  signInStarted: (props: { provider: string }) =>
    capture('auth_sign_in_started', props),
  signInSuccess: () =>
    capture('auth_sign_in_success'),
  signInError: (props: { error: string }) =>
    capture('auth_sign_in_error', props),
  signOut: () =>
    capture('auth_sign_out'),

  // SSO / onboarding
  ssoCallbackProcessing: () =>
    capture('auth_sso_callback_processing'),
  onboardingStarted: () =>
    capture('auth_onboarding_started'),
  onboardingCompleted: () =>
    capture('auth_onboarding_completed'),
  passkeyRegistered: () =>
    capture('auth_passkey_registered'),
  passwordSetupCompleted: () =>
    capture('auth_password_setup_completed'),
  recoveryPhraseShown: () =>
    capture('auth_recovery_phrase_shown'),
};

// ---------------------------------------------------------------------------
// E2EE
// ---------------------------------------------------------------------------

const e2ee = {
  unlockModalShown: () =>
    capture('e2ee_unlock_modal_shown'),
  unlockAttempted: (props: { method: 'passkey' | 'password' | 'recovery' }) =>
    capture('e2ee_unlock_attempted', props),
  unlockSuccess: (props: { method: string }) =>
    capture('e2ee_unlock_success', props),
  unlockError: (props: { method: string; error: string }) =>
    capture('e2ee_unlock_error', props),
  locked: () =>
    capture('e2ee_locked'),
  resetInitiated: () =>
    capture('e2ee_reset_initiated'),
  resetConfirmed: () =>
    capture('e2ee_reset_confirmed'),
};

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

const chat = {
  created: (props: { model_id: string }) =>
    capture('chat_created', props),
  messageSent: (props: {
    model_id: string;
    has_attachments?: boolean;
    search_enabled?: boolean;
  }) =>
    capture('chat_message_sent', props),
  messageStreaming: (props: { model_id: string }) =>
    capture('chat_message_streaming', props),
  messageStreamCompleted: (props: { model_id: string }) =>
    capture('chat_message_stream_completed', props),
  messageStreamStopped: () =>
    capture('chat_message_stream_stopped'),
  messageEdited: () =>
    capture('chat_message_edited'),
  messageRegenerated: (props?: { model_id?: string }) =>
    capture('chat_message_regenerated', props),
  messageDeleted: () =>
    capture('chat_message_deleted'),
  branchSwitched: () =>
    capture('chat_branch_switched'),
  followUpClicked: () =>
    capture('chat_follow_up_clicked'),
  webSearchExecuted: (props: { provider: string }) =>
    capture('chat_web_search_executed', props),
  renamed: () =>
    capture('chat_renamed'),
  deleted: () =>
    capture('chat_deleted'),
  pinned: () =>
    capture('chat_pinned'),
  unpinned: () =>
    capture('chat_unpinned'),
  movedToFolder: () =>
    capture('chat_moved_to_folder'),
  removedFromFolder: () =>
    capture('chat_removed_from_folder'),
  codeBlockCopied: () =>
    capture('chat_code_block_copied'),
  messageCopied: () =>
    capture('chat_message_copied'),
  sourceClicked: () =>
    capture('chat_source_clicked'),
  attachmentAdded: (props: { type: string }) =>
    capture('chat_attachment_added', props),
};

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

const model = {
  selected: (props: { model_id: string; provider: string }) =>
    capture('model_selected', props),
  selectorOpened: () =>
    capture('model_selector_opened'),
  searched: () =>
    capture('model_searched'),
  filterApplied: (props: { provider: string }) =>
    capture('model_filter_applied', props),
  pinned: (props: { model_id: string }) =>
    capture('model_pinned', props),
  unpinned: (props: { model_id: string }) =>
    capture('model_unpinned', props),
};

// ---------------------------------------------------------------------------
// Connections (API keys)
// ---------------------------------------------------------------------------

const connections = {
  addStarted: (props: { provider_id: string }) =>
    capture('connection_add_started', props),
  saved: (props: { provider_id: string }) =>
    capture('connection_saved', props),
  edited: (props: { provider_id: string }) =>
    capture('connection_edited', props),
  deleted: (props: { provider_id: string }) =>
    capture('connection_deleted', props),
  tested: (props: { provider_id: string; success: boolean }) =>
    capture('connection_tested', props),
};

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

const notes = {
  created: () =>
    capture('note_created'),
  selected: () =>
    capture('note_selected'),
  saved: () =>
    capture('note_saved'),
  archived: () =>
    capture('note_archived'),
  deleted: () =>
    capture('note_deleted'),
};

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const prompts = {
  created: () =>
    capture('prompt_created'),
  saved: () =>
    capture('prompt_saved'),
  selected: () =>
    capture('prompt_selected'),
};

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const settings = {
  opened: (props?: { tab?: string }) =>
    capture('settings_opened', props),
  tabViewed: (props: { tab: string }) =>
    capture('settings_tab_viewed', props),
  themeChanged: (props: { theme: string }) =>
    capture('settings_theme_changed', props),
  languageChanged: (props: { language: string }) =>
    capture('settings_language_changed', props),
  systemPromptChanged: () =>
    capture('settings_system_prompt_changed'),
  chatsExported: () =>
    capture('settings_chats_exported'),
  chatsImported: () =>
    capture('settings_chats_imported'),
  allChatsDeleted: () =>
    capture('settings_all_chats_deleted'),
  apiTokenCreated: () =>
    capture('settings_api_token_created'),
  apiTokenRevoked: () =>
    capture('settings_api_token_revoked'),
  deviceRevoked: () =>
    capture('settings_device_revoked'),
  passwordChanged: () =>
    capture('settings_password_changed'),
};

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

const billing = {
  planSelected: (props: { plan_id: string; interval?: string }) =>
    capture('billing_plan_selected', props),
  checkoutInitiated: (props: { plan_id: string }) =>
    capture('billing_checkout_initiated', props),
  intervalToggled: (props: { interval: 'monthly' | 'yearly' }) =>
    capture('billing_interval_toggled', props),
};

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

const search = {
  opened: () =>
    capture('search_opened'),
  queryEntered: (props: { query_length: number }) =>
    capture('search_query_entered', props),
  resultClicked: (props: { type: 'chat' | 'message' | 'note' }) =>
    capture('search_result_clicked', props),
};

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

const sidebar = {
  folderCreated: () =>
    capture('sidebar_folder_created'),
  folderRenamed: () =>
    capture('sidebar_folder_renamed'),
  folderDeleted: () =>
    capture('sidebar_folder_deleted'),
};

// ---------------------------------------------------------------------------
// Landing / Pricing (public pages)
// ---------------------------------------------------------------------------

const marketing = {
  heroCTAClicked: (props: { action: string }) =>
    capture('marketing_hero_cta_clicked', props),
  pricingCTAClicked: (props: { plan_id: string }) =>
    capture('marketing_pricing_cta_clicked', props),
};

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

const account = {
  deleteRequested: () =>
    capture('account_delete_requested'),
  deleteConfirmed: () =>
    capture('account_delete_confirmed'),
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const analytics = {
  identify,
  reset,
  capture,
  auth,
  e2ee,
  chat,
  model,
  connections,
  notes,
  prompts,
  settings,
  billing,
  search,
  sidebar,
  marketing,
  account,
};
