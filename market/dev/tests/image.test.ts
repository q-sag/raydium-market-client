// fetchImage.ts

// Uncomment the following lines if you're using Node.js version < 18
// import fetch from 'node-fetch';

// Define the interface for the expected metadata
interface OffChainMetadata {
    name?: string;
    symbol?: string;
    description?: string;
    image?: string;
    attributes?: Array<{
      trait_type: string;
      value: string;
    }>;
    external_url?: string;
    // Add other fields if necessary
  }
  
  /**
   * Fetches JSON data from a given URL.
   * @param url - The URL to fetch data from.
   * @returns A promise that resolves to the parsed JSON object.
   */
  async function fetchJSON(url: string): Promise<any> {
    try {
      const response = await fetch(url);
  
      if (!response.ok) {
        throw new Error(`Network response was not ok. Status: ${response.status} ${response.statusText}`);
      }
      const data = await response;

      console.log(data);

      return data;
    } catch (error) {
      throw new Error(`Failed to fetch JSON from ${url}: ${error}`);
    }
  }
  
  /**
   * Extracts the image URL from the metadata.
   * @param metadata - The metadata object.
   * @returns The image URL if present, otherwise null.
   */
  function extractImageURL(metadata: OffChainMetadata): string | null {
    if (metadata.image) {
      return metadata.image;
    }
    return null;
  }
  
  /**
   * Main function to execute the fetch and extraction.
   */
  async function main() {
    const ipfsURL = 'https://arweave.net/IiX6OFxiM1wb8DOSidDSn_6KVHqCpwnshUzU8RU5EN8';
  
    try {
      console.log(`Fetching metadata from: ${ipfsURL}`);
      const metadata = await fetchJSON(ipfsURL);
      console.log('Fetched Metadata:', metadata);
  
      const imageURL = extractImageURL(metadata);
  
      if (imageURL) {
        console.log(`\nImage URL: ${imageURL}`);
      } else {
        console.log('\nNo image URL found in the metadata.');
      }
    } catch (error) {
      console.error(`Error: ${error}`);
    }
  }
  
  // Execute the main function
  main();
  