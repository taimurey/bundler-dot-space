import axios from "axios";

export async function ApibundleSend(
    bundle: any,
    blockengine: string,
) {
    try {
        const response = await axios.post(
            `https://${blockengine}/api/v1/bundles`,
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

            // Send another request to get the bundle status
            const statusData = {
                jsonrpc: "2.0",
                id: 1,
                method: "getBundleStatuses",
                params: [[bundleId]]
            };

            const statusResponse = await axios.post(
                `https://${blockengine}/api/v1/bundles`,
                statusData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (statusResponse.status === 200) {
                console.log('status response:', statusResponse.data);
            }
        }

        return response.data.result;
    } catch (error: any) {
        throw new Error(`Error sending bundle: ${error.message}`);
    }
}