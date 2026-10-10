'use strict';

// Generic key/value access over the AppSetting model. One model per service:
// AppSetting only. Created here because the option-chain bookmarks endpoints
// persist into app_settings; see FINDINGS — AppSetting is a shared model (also
// touched by execution/mailer settings), so the orchestrator should dedupe if a
// sibling wave created its own AppSetting service.
const { AppSetting } = require('../models');

async function getValue(key) {
  const row = await AppSetting.findByPk(key);
  return row ? row.value : null;
}

async function setValue(key, value) {
  await AppSetting.upsert({ key, value });
  return value;
}

module.exports = { getValue, setValue };
