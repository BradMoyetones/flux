export const APP_CONFIG = {
    github: {
        owner: 'BradMoyetones',
        repo: 'flux',
    },
    getReleaseUrl(versionTag: string) {
        return `https://github.com/${this.github.owner}/${this.github.repo}/releases/tag/${versionTag}`;
    },
    getRepoUrl() {
        return `https://github.com/${this.github.owner}/${this.github.repo}`;
    },
    getReportBugUrl() {
        return `https://github.com/${this.github.owner}/${this.github.repo}/issues/new/choose`;
    },
    getDocumentationUrl() {
        return `https://github.com/${this.github.owner}/${this.github.repo}/blob/main/docs/README.md`;
    },
};
