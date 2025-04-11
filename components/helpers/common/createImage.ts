export function createImageFromInitials(name: string): string | null {
    if (!name) return null;

    // Create a canvas element
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) return null;

    canvas.width = 200;
    canvas.height = 200;

    // Draw circle background
    context.fillStyle = getRandomColor();
    context.beginPath();
    context.arc(100, 100, 100, 0, Math.PI * 2, true);
    context.fill();

    // Draw text
    context.font = "bold 80px Arial";
    context.fillStyle = "#FFFFFF";
    context.textAlign = "center";
    context.textBaseline = "middle";

    // Get the first letter or first two letters
    const initials = name.substring(0, Math.min(2, name.length)).toUpperCase();

    context.fillText(initials, 100, 100);

    return canvas.toDataURL('image/png');
}

function getRandomColor(): string {
    const colors = [
        "#3498db", // Blue
        "#e74c3c", // Red
        "#2ecc71", // Green
        "#f39c12", // Orange
        "#9b59b6", // Purple
        "#1abc9c", // Turquoise
        "#34495e", // Dark blue
        "#d35400", // Pumpkin
        "#7f8c8d", // Gray
        "#27ae60", // Emerald
    ];

    return colors[Math.floor(Math.random() * colors.length)];
} 