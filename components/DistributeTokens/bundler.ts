import axios from "axios";

export async function ApibundleSend(
    bundle: any,
    blockengine: string,
) {
    console.log('blockengine:', blockengine);
    try {
        const response = await axios.post(
            `https://mainnet.block-engine.jito.wtf/api/v1/bundles`,
            bundle,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.status === 200) {
            console.log('response:', response.data);
            const bundleId = response.data.result;

            // Fetch the response three times
            for (let i = 0; i < 3; i++) {
                // Delay the execution of the next request
                setTimeout(async () => {
                    // Send another request to get the bundle status
                    const statusData = {
                        jsonrpc: "2.0",
                        id: 1,
                        method: "getBundleStatuses",
                        params: [[bundleId]]
                    };

                    const statusResponse = await axios.post(
                        `https://mainnet.block-engine.jito.wtf/api/v1/bundles`,
                        statusData,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        }
                    );

                    console.log('statusResponse:', statusResponse.data);
                }, 5000 * i); // Delay of 5 seconds multiplied by the current iteration
            }
        }

        return response.data.result;
    } catch (error: any) {
        throw new Error(`Error sending bundle: ${error.message}`);
    }
}