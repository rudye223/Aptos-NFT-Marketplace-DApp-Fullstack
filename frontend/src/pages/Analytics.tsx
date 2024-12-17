// src/pages/AnalyticsPage.tsx
import React, { useState, useEffect } from "react";
import { Modal, Button, message, Spin, Card } from "antd";
import { AptosClient } from "aptos";
import { MARKET_PLACE_ADDRESS } from "../Constants";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { motion } from "framer-motion"; // Animation library
const { Meta } = Card;

const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

const Analytics  = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const { account } = useWallet();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await client.view({
          function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::get_analytics`,
          arguments: [MARKET_PLACE_ADDRESS],
          type_arguments: [],
        });

        // Transform the raw data into a more usable structure
        const transformedAnalytics = {
          total_nfts_sold: parseInt(data[0], 10), // Convert to number
          total_trading_volume: parseInt(data[1], 10), // Convert to number
          trending_nfts: data[2], // This is already an array of IDs
          active_users: data[3], // This is an array of addresses
          sales_volume_over_time: data[4], // This is an empty array for now
        };

        setAnalytics(transformedAnalytics);
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
            cover={<img alt="total-nfts" src="https://img.icons8.com/ios/452/sold-out.png" />}
          >
            <Meta title="Total NFTs Sold" description={analytics.total_nfts_sold} />
          </Card>

          {/* Total Trading Volume */}
          <Card
            hoverable
            style={{ width: 300, marginBottom: 20 }}
            cover={<img alt="total-volume" src="https://img.icons8.com/ios/452/graph.png" />}
          >
            <Meta title="Total Trading Volume" description={`$${analytics.total_trading_volume}`} />
          </Card>

          {/* Trending NFTs */}
          <Card
            hoverable
            style={{ width: 300, marginBottom: 20 }}
            cover={<img alt="trending" src="https://img.icons8.com/ios/452/fire-element.png" />}
          >
            <Meta title="Trending NFTs" description={analytics.trending_nfts.join(", ")} />
          </Card>

          {/* Active Users */}
          <Card
            hoverable
            style={{ width: 300, marginBottom: 20 }}
            cover={<img alt="active-users" src="https://img.icons8.com/ios/452/user-group-man-man.png" />}
          >
            <Meta title="Active Users" description={analytics.active_users.length} />
          </Card>
        </div>

        <div style={{ textAlign: "center", marginTop: "50px" }}>
          <Button type="primary" size="large" style={{ marginRight: "20px" }} onClick={() => window.location.reload()}>
            Refresh Analytics
          </Button>
          <Button
            type="default"
            size="large"
            onClick={() => {
              Modal.info({
                title: "Detailed Analytics",
                content: (
                  <div>
                    <h3>Total NFTs Sold: {analytics.total_nfts_sold}</h3>
                    <h3>Total Trading Volume: ${analytics.total_trading_volume}</h3>
                    <h3>Trending NFTs: {analytics.trending_nfts.join(", ")}</h3>
                    <h3>Active Users: {analytics.active_users.length}</h3>
                  </div>
                ),
                onOk() {},
              });
            }}
          >
            View Detailed Analytics
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default Analytics ;
