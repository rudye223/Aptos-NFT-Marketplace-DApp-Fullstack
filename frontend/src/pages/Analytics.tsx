import React, { useState, useEffect } from "react";
import { Modal, Button, message, Spin, Card, Progress } from "antd";
import { AptosClient } from "aptos";
import { MARKET_PLACE_ADDRESS, MARKET_PLACE_NAME } from "../Constants";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { motion } from "framer-motion"; // Animation library
import { fetchNFTDataUtil } from "../utils/fetchNFTData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts"; // Adding BarChart

const { Meta } = Card;

const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");
const decodeSalesVolume = (encoded) => {
  // Assuming each encoded entry has 'time' and 'volume' properties
  const time = encoded.time; // Unix timestamp
  const volume = encoded.volume; // Trading volume
  
  // Returning the decoded entry in a readable format
  return {
    time: new Date(time * 1000).toLocaleDateString(), // Convert to readable date
    volume: volume, // Volume value
  };
};

const Analytics = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [trendingNFTDetails, setTrendingNFTDetails] = useState<any[]>([]);

  const { account } = useWallet();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await client.view({
          function: `${MARKET_PLACE_ADDRESS}::${MARKET_PLACE_NAME}::get_analytics`,
          arguments: [MARKET_PLACE_ADDRESS],
          type_arguments: [],
        }) as any;
        console.log("data::", data);
    
        const transformedAnalytics = {
          total_nfts_sold: parseInt(data[0], 10),
          total_trading_volume: parseInt(data[1], 10),
          trending_nfts: data[2], // Array of NFT IDs
          active_users: data[3],
          sales_volume_over_time: data[4], // Array of SalesVolumeEntry
        };
    
        console.log("transformedAnalytics::", transformedAnalytics);
    
        // Decode sales_volume_over_time into a readable format
        const salesVolumeOverTime = transformedAnalytics.sales_volume_over_time.map((encoded) => {
          return decodeSalesVolume(encoded); // Decode each SalesVolumeEntry
        });
    
        setAnalytics({
          ...transformedAnalytics,
          salesVolumeOverTime,
        });
    
        // Fetch details for trending NFTs
        if (transformedAnalytics.trending_nfts?.length > 0) {
          const nftDetails = await Promise.all(
            transformedAnalytics.trending_nfts.map((tokenId: string) =>
              fetchNFTDataUtil(tokenId, account?.address, client)
            )
          );
          setTrendingNFTDetails(nftDetails.filter((nft) => nft)); // Filter out null values
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
        message.error("Failed to fetch analytics.");
      } finally {
        setLoading(false);
      }
    };
    

    if (account) {
      fetchAnalytics();
    }
  }, [account]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div style={{ textAlign: "center", paddingTop: "50px" }}>
        <h3>No Analytics Available</h3>
      </div>
    );
  }

  return (
    <div style={{ margin: "50px auto", maxWidth: "1200px" }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "30px", color: "#1890ff" }}>
          Marketplace Analytics
        </h2>

        <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap" }}>
          {/* Total NFTs Sold */}
          <Card
            hoverable
            style={{ width: 300, marginBottom: 20 }}
            cover={<img alt="total-nfts" src="https://img.icons8.com/ios/452/empty-box.png" style={{ width: "100%", height: "200px", objectFit: "contain" }} />}
          >
            <Meta title="Total NFTs Sold" description={analytics.total_nfts_sold} />
          </Card>

          {/* Total Trading Volume */}
          <Card
            hoverable
            style={{ width: 300, marginBottom: 20 }}
            cover={<img alt="total-volume" src="https://img.icons8.com/ios/452/graph.png" style={{ width: "100%", height: "200px", objectFit: "contain" }} />}
          >
            <Meta title="Total Trading Volume" description={`$${analytics.total_trading_volume}`} />
          </Card>

          {/* Active Users */}
          <Card
            hoverable
            style={{ width: 300, marginBottom: 20 }}
            cover={<img alt="active-users" src="https://img.icons8.com/ios/452/user-group-man-man.png" style={{ width: "100%", height: "200px", objectFit: "contain" }} />}
          >
            <Meta title="Active Users" description={analytics.active_users.length} />
          </Card>
        </div>

        {/* Bar Chart for Sales Volume Over Time */}
        <div style={{ marginTop: "30px", textAlign: "center" }}>
          <h3>Sales Volume Over Time</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={analytics.salesVolumeOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="volume" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Circular Progress for Active Users */}
        <div style={{ marginTop: "30px", textAlign: "center" }}>
          <h3>Active Users Progress</h3>
          <Progress
            type="circle"
            percent={(analytics.active_users.length / 1000) * 100} // Example: Assuming 1000 users is the max
            format={(percent) => `${analytics.active_users.length} users`}
            width={120}
          />
        </div>

        <div style={{ marginTop: "30px" }}>
          <h3 style={{ textAlign: "center", marginBottom: "20px" }}>Trending NFTs</h3>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "20px" }}>
            {trendingNFTDetails.map((nft) => (
              <Card
                key={nft.id}
                hoverable
                style={{ width: 300 }}
                cover={<img alt={nft.name} src={nft.uri} style={{ height: 200, width: "100%", objectFit: "cover" }} />}
              >
                <Meta title={nft.name} description={`Price: ${nft.price} APT`} />
              </Card>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Analytics;
