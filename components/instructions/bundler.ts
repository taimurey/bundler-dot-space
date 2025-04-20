export async function ApibundleSend(
    bundle: any,
    blockengine: string,
) {
    const response = await fetch('https://api.bundler.space/send-bundle', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blockengine: `https://${blockengine}`, txns: bundle })
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${message}`);
    }

    const result = await response.json();

    return result;
}