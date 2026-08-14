export function relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const min = Math.round(diff / 60000);
    if (min < 1) return 'hace un momento';
    if (min < 60) return `hace ${min} min`;
    const hours = Math.round(min / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.round(hours / 24);
    if (days < 30) return `hace ${days} d`;
    const months = Math.round(days / 30);
    return `hace ${months} mes${months > 1 ? 'es' : ''}`;
}

export function workspaceName(path: string): string {
    return path.split(/[/\\]/).pop() || path;
}
