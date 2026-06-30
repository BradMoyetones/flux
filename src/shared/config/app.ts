export const APP_CONFIG = {
    github: {
        owner: 'BradMoyetones',
        repo: 'flux',
    },
    getReleaseUrl(versionTag: string) {
        return `https://github.com/${this.github.owner}/${this.github.repo}/releases/tag/${versionTag}`;
    },
};
