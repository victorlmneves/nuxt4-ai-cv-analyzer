// Centralized date formatting composable
export function useDateFormat() {
    function formatDate(iso: string): string {
        return new Date(iso).toLocaleDateString('pt-PT', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    }

    return { formatDate };
}
