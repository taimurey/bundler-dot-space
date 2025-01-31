import { FC, useState, ChangeEvent } from "react";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";

interface LinkToastProps {
  link: string;
  message: string;
}

const LinkToast: FC<LinkToastProps> = ({ link, message }) => (
  <div>
    <p>{message}</p>
    <a href={link} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
      {link}
    </a>
  </div>
);

const UploadMetadata: FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenDescription, setTokenDescription] = useState("");
  const [jsonUri, setJsonUri] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        setUploading(true);

        try {
          const imageBlob = await fetch(base64Image).then((res) => res.blob());
          const imageBuffer = await imageBlob.arrayBuffer();
          const imageUint8Array = new Uint8Array(imageBuffer);
          const imageArray = Array.from(imageUint8Array);

          const response = await fetch('https://mevarik-deployer.xyz:2791/upload-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: imageArray })
          });

          const responseText = await response.text();
          const httpUrl = `https://ipfs.io/ipfs/${responseText}`;

          toast(() => (
            <LinkToast
              link={httpUrl}
              message="Image Uploaded Successfully"
            />
          ));

          setUploadedImageUrl(httpUrl);
        } catch (error) {
          console.error('Error uploading file:', error);
          toast.error('Failed to upload image');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadMetadata = async () => {
    setIsLoading(true);
    try {
      if (!uploadedImageUrl) {
        throw new Error("Please upload an image first");
      }

      const json = {
        name: tokenName,
        symbol: tokenSymbol,
        description: tokenDescription,
        image: uploadedImageUrl,
      };

      const response = await fetch('https://mevarik-deployer.xyz:2791/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: Array.from(new TextEncoder().encode(JSON.stringify(json)))
        })
      });

      const responseText = await response.text();
      const ipfsJsonUri = `https://ipfs.io/ipfs/${responseText}`;
      setJsonUri(ipfsJsonUri);

      toast(() => (
        <LinkToast
          link={ipfsJsonUri}
          message="Metadata Uploaded Successfully"
        />
      ));
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to upload metadata');
      }
    }
    setIsLoading(false);
  };

  return (
    <div>
      {(isLoading || uploading) && (
        <div className="absolute top-0 left-0 z-50 flex h-screen w-full items-center justify-center bg-black/[.3] backdrop-blur-[10px]">
          <ClipLoader />
        </div>
      )}
      {!jsonUri ? (
        <div>
          <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
            <div className="m-auto p-2">
              <div className="text-xl font-normal">Token icon</div>
              <p>Image file of your future token.</p>
            </div>

            <div className="flex p-2">
              <div className="m-auto rounded border border-dashed border-white px-2">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <label className="cursor-pointer font-medium text-purple-500 hover:text-indigo-500">
                  <span>Upload an image</span>
                  <input
                    type="file"
                    className="sr-only"
                    onChange={handleImageUpload}
                    accept="image/*"
                  />
                </label>
                {imageFile && (
                  <p className="text-xs text-gray-500">{imageFile.name}</p>
                )}
                {uploadedImageUrl && (
                  <img src={uploadedImageUrl} alt="Uploaded" className="mt-2 max-w-xs" />
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
            <div className="m-auto p-2 text-xl font-normal">Token name</div>
            <div className="m-auto p-2">
              <input
                className="rounded border px-4 py-2 text-xl font-normal text-gray-700 focus:border-blue-600 focus:outline-none"
                onChange={(e) => setTokenName(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
            <div className="m-auto p-2">
              <div className="text-xl font-normal">Token symbol</div>
              <p>{"Abbreviated name (e.g. Solana -> SOL)."}</p>
            </div>
            <div className="m-auto p-2">
              <input
                className="rounded border px-4 py-2 text-xl font-normal text-gray-700 focus:border-blue-600 focus:outline-none"
                onChange={(e) => setTokenSymbol(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
            <div className="m-auto p-2">
              <div className="text-xl font-normal">Token description</div>
              <p>Few words about your token purpose.</p>
            </div>
            <div className="m-auto p-2">
              <input
                className="rounded border px-4 py-2 text-xl font-normal text-gray-700 focus:border-blue-600 focus:outline-none"
                onChange={(e) => setTokenDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              className="w-full md:max-w-xs rounded-lg p-2 m-2 animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] px-8 hover:from-pink-500 hover:to-yellow-500 float-right"
              onClick={uploadMetadata}
            >
              Upload Metadata
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 break-words">
          <p className="font-medium">
            Link to your uploaded metadata. You will need this as uri parameter
            when creating a token.
          </p>
          <a
            className="cursor-pointer font-medium text-purple-500 hover:text-indigo-500"
            href={jsonUri}
            target="_blank"
            rel="noreferrer"
          >
            {jsonUri}
          </a>
        </div>
      )}
    </div>
  );
};

export default UploadMetadata;