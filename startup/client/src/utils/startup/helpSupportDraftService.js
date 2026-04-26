class HelpSupportDraftService {
  constructor() {
    this.draft = null;
  }

  setDraft(payload) {
    this.draft = payload;
  }

  consumeDraft() {
    const current = this.draft;
    this.draft = null;
    return current;
  }
}

const helpSupportDraftService = new HelpSupportDraftService();

export { helpSupportDraftService };
