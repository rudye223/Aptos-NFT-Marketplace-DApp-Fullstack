import React, { useState, useEffect } from "react";
import { Button, Input, Card, Spin, message, Modal, Row, Col, Typography, Tag } from "antd";
import { AptosClient } from "aptos";
import { useParams } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { MARKET_PLACE_ADDRESS } from "../Constants";
import { CheckOutlined, EditOutlined, DollarCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");
const rarityColors: { [key: number]: string } = {
  1: "green",
  2: "blue",
  3: "purple",
  4: "orange",
};

const rarityLabels: { [key: number]: string } = {
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Super Rare",
};

const NFTDetail: React.FC = () => {
  const { tokenId } = useParams<{ tokenId: string }>();
  const [nftDetails, setNftDetails] = useState<any>(null);
  const [auctionData, setAuctionData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [salePrice, setSalePrice] = useState<string>("");
  const [startingBid, setStartingBid] = useState<string>("");
  const [auctionDuration, setAuctionDuration] = useState<string>("");
  const { account } = useWallet();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAuctionModalVisible, setIsAuctionModalVisible] = useState(false);
  const [bidAmount, setBidAmount] = useState<string>("");
  const [isBidModalVisible, setIsBidModalVisible] = useState(false);
  const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);
  useEffect(() => {


    fetchNFTData();
  }, [tokenId, account]);
  const fetchNFTData = async () => {
    if (!tokenId) return;

    setLoading(true);

    try {
      const nftDetails = await client.view({
        function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::get_nft_details_current`,
        arguments: [MARKET_PLACE_ADDRESS, tokenId],
        type_arguments: [],
      });

      const auc = nftDetails[8];
      const auc_2 = auc['vec'];
      const auction = auc_2[0];

      const [nftId, owner, name, description, uri, price, for_sale, rarity] = nftDetails as [
        number,
        string,
        string,
        string,
        string,
        number,
        boolean,
        number
      ];

      const hexToUint8Array = (hexString: string): Uint8Array => {
        const bytes = new Uint8Array(hexString.length / 2);
        for (let i = 0; i < hexString.length; i += 2) {
          bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
        }
        return bytes;
      };
      const nft = {
        id: nftId,
        name: new TextDecoder().decode(hexToUint8Array(name.slice(2))),
        description: new TextDecoder().decode(hexToUint8Array(description.slice(2))),
        uri: new TextDecoder().decode(hexToUint8Array(uri.slice(2))),
        rarity,
        price: price / 100000000, // Convert octas to APT
        for_sale,
        owner,
        auction
      }
      console.log("nft::", nft)
      setNftDetails(nft);
      try {
        const auction_data = {
          end_time: auction.end_time,
          highest_bid: auction.highest_bid / 100000000, // Convert octas to APT,
          highest_bidder: auction.highest_bidder,
          nft_id: auction.nft_id,
          starting_price: auction.starting_price / 100000000, // Convert octas to APT
        }
        console.log("auction::", auction_data)
        setAuctionData(auction_data);
      } catch (error) {
        console.error(`destructurng error`, error);
      }

    } catch (error) {
      console.error(`Error fetching details for NFT ID ${tokenId}:`, error);
      message.error("Error fetching NFT details.");
    } finally {
      setLoading(false);
    }
  };
  const handleConfirmListing = async () => {
    if (!salePrice) return;

    try {
      const priceInOctas = parseFloat(salePrice) * 100000000;

      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::list_for_sale`,
        type_arguments: [],
        arguments: [MARKET_PLACE_ADDRESS, nftDetails.id.toString(), priceInOctas.toString()],
      };

      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);

      message.success("NFT listed for sale successfully!");
      setSalePrice("");
      await fetchNFTData()
      setIsModalVisible(false);

    } catch (error) {
      console.error("Error listing NFT for sale:", error);
      message.error("Failed to list NFT for sale.");
    }
  };

  const handleConfirmAuction = async () => {
    if (!startingBid || !auctionDuration) return;

    try {
      const bidInOctas = parseFloat(startingBid) * 100000000;
      const durationInSeconds = parseInt(auctionDuration);

      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::start_auction`,
        type_arguments: [],
        arguments: [
          MARKET_PLACE_ADDRESS,
          nftDetails.id.toString(),
          bidInOctas.toString(),
          durationInSeconds.toString(),
        ],
      };

      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);

      message.success("Auction started successfully!");
      setStartingBid("");
      setAuctionDuration("");
      setIsAuctionModalVisible(false);
      await fetchNFTData()
    } catch (error) {
      console.error("Error starting auction:", error);
      message.error("Failed to start auction.");
    }
  };
  const handleEndSale = async () => {
    // Logic for ending the sale (e.g., calling a smart contract function)
    // Update state to reflect that the NFT is no longer for sale
  };

  const handleEndAuction = async (nftId: number) => {
    if (!account) return;

    try {
      const entryFunctionPayload = {
        function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::end_auction`,
        type_arguments: [],
        arguments: [MARKET_PLACE_ADDRESS, nftId],
      };

      const txnResponse = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      console.log("Transaction Response:", txnResponse);
      await client.waitForTransaction(txnResponse.hash);
      message.success(`Auction ended successfully!`);
      await fetchNFTData()
    } catch (error) {
      console.error("Error ending auction:", error);
      message.error("Failed to end auction.");
    }
  };
  const handlePlaceBid = async () => {
    console.log("bid amount::", bidAmount)
    if (!bidAmount || !auctionData) {
      message.error("Please enter a valid bid amount.");
      return;
    }
    if (bidAmount <= auctionData.highest_bid) {
      message.error("Bid amount must be higher than the current highest bid.");
      return;
    }
    const precision = 100000000; // This assumes 8 decimals for the token

    // Step 2: Scale the bid amount to avoid floating point precision issues
    const bidInOctas = BigInt(Math.ceil(parseFloat(bidAmount) * precision));

    try {
      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::place_bid`,
        type_arguments: [],
        arguments: [
          MARKET_PLACE_ADDRESS,
          nftDetails.id.toString(),
          bidInOctas.toString(),
        ],
      };

      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);

      message.success("Bid placed successfully!");
      setBidAmount(""); // Clear bid input
      setIsBidModalVisible(false); // Close modal
      await fetchNFTData()
    } catch (error) {
      console.error("Error placing bid:", error);
      message.error("Failed to place bid.");
    }
  };
  const handleBuyClick = () => {

    setIsBuyModalVisible(true);
  };

  const handleCancelBuy = () => {
    setIsBuyModalVisible(false);

  };

  const handleConfirmPurchase = async () => {
    if (!nftDetails) return;

    try {
      const priceInOctas = nftDetails.price * 100000000;

      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${MARKET_PLACE_ADDRESS}::NFTMarketplace::purchase_nft`,
        type_arguments: [],
        arguments: [MARKET_PLACE_ADDRESS, nftDetails.id.toString(), priceInOctas.toString()],
      };

      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);

      message.success("NFT purchased successfully!");
      setIsBuyModalVisible(false);
      await fetchNFTData()

    } catch (error) {
      console.error("Error purchasing NFT:", error);
      message.error("Failed to purchase NFT.");
    }
  };

  if (loading) {
    return <Spin size="large" />;
  }

  return (
    <div style={{ padding: '20px', display: "flex", alignItems: "center", justifyContent: "center" }}>
      {nftDetails && (
        <Card
          title={<Title level={3}>{nftDetails.name}</Title>}
          extra={<Tag
            color={rarityColors[nftDetails.rarity]}
            style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "10px" }}
          >
            {rarityLabels[nftDetails.rarity]}
          </Tag>}
          style={{ width: 430, marginBottom: 20 }}
          cover={<img alt={nftDetails.name} src={nftDetails.uri} />}
        >
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Paragraph style={{ margin: '5px 0', fontSize: '16px' }}><Text strong>NFT ID:</Text> {nftDetails.id}</Paragraph>
              <Paragraph style={{ margin: '5px 0', fontSize: '16px' }}><Text strong>Price:</Text> {nftDetails.price} APT</Paragraph>
            </Col>
            <Col span={12}>
              <Paragraph style={{ margin: '5px 0', fontSize: '16px' }}><Text strong>Rarity:</Text> {rarityLabels[nftDetails.rarity]}</Paragraph>
              <Paragraph style={{ margin: '5px 0', fontSize: '16px' }}><Text strong>For Sale:</Text> {nftDetails.for_sale ? 'Yes' : 'No'}</Paragraph>
            </Col>
          </Row>

          <Paragraph style={{ marginTop: '20px', fontSize: '16px', lineHeight: 1.5 }}>
            <Text strong >Description:</Text> {nftDetails.description}
          </Paragraph>
          {auctionData && (
            <div style={{ marginBottom: 20 }}>
              <hr></hr>
              <Title level={4}>Auction Information</Title>
              <p>Auction End Time:  {new Date(auctionData.end_time * 1000).toLocaleString()}</p>
              <p>Starting Bid: {auctionData.starting_price} APT</p>
              <p>Highest Bid: {auctionData.highest_bid} APT</p>
            </div>
          )}
          <Row gutter={16}>
            <Col span={12}>
              {auctionData ? (
                // If auction data exists
                nftDetails.owner === account?.address ? (
                  <Button
                    type="primary"
                    block
                    onClick={() => setIsBidModalVisible(true)} // Function to open the bid modal
                    icon={<DollarCircleOutlined />}
                  >
                    Place Bid
                  </Button>
                ) : (
                  <Button type="link">
                    Ongoing Auction
                  </Button>
                )
              ) : (
                nftDetails.for_sale ? (
                  // If for_sale is true and no auction data, show End Sale button if the user is the owner
                  nftDetails.owner === account?.address ? (
                    <Button
                      type="primary"
                      danger
                      block
                      onClick={handleEndSale}
                      icon={<DollarCircleOutlined />}
                    >
                      End Sale
                    </Button>
                  ) : <Button   type="primary" onClick={() => handleBuyClick()}>
                    Buy
                  </Button>
                ) : (
                  // If for_sale is false, show List for Sale button if the user is the owner
                  nftDetails.owner === account?.address ? (
                    <Button
                      type="primary"
                      block
                      onClick={() => setIsModalVisible(true)}
                      icon={<DollarCircleOutlined />}
                    >
                      List for Sale
                    </Button>
                  ) : null
                )
              )}

            </Col>

            <Col span={12}>
              {
                auctionData ? (
                  // If auction data exists
                  nftDetails.owner === account?.address ? (
                    // If the user is the owner of the NFT, show the "End Auction" button
                    <Button
                      type="link"
                      danger
                      block
                      onClick={() => handleEndAuction(nftDetails.id)} // Function to end the auction
                      icon={<ClockCircleOutlined />}
                    >
                      End Auction
                    </Button>
                  ) : (
                    // If the user is not the owner, show the "Place Bid" button
                    <Button
                      type="primary"
                      block
                      onClick={() => setIsBidModalVisible(true)} // Function to open the bid modal
                      icon={<DollarCircleOutlined />}
                    >
                      Place Bid
                    </Button>
                  )
                ) : (
                  // If there is no auction data, only the owner can start the auction
                  nftDetails.owner === account?.address && (
                    <Button
                      type="primary"
                      block
                      onClick={() => setIsAuctionModalVisible(true)} // Function to start the auction
                      icon={<ClockCircleOutlined />}
                      disabled={nftDetails.for_sale}
                    >
                      Start Auction
                    </Button>
                  )
                )
              }

            </Col>

          </Row>

        </Card>
      )}


      {/* List for Sale Modal */}
      <Modal
        title="List NFT for Sale"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Input
          placeholder="Enter sale price in APT"
          value={salePrice}
          onChange={(e) => setSalePrice(e.target.value)}
          style={{ marginBottom: 20 }}
        />
        <Row justify="end">
          <Button onClick={() => setIsModalVisible(false)} style={{ marginRight: 10 }}>
            Cancel
          </Button>
          <Button type="primary" onClick={handleConfirmListing} icon={<CheckOutlined />}>
            Confirm Listing
          </Button>
        </Row>
      </Modal>

      {/* Start Auction Modal */}
      <Modal
        title="Start Auction"
        visible={isAuctionModalVisible}
        onCancel={() => setIsAuctionModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Input
          placeholder="Enter starting bid in APT"
          value={startingBid}
          onChange={(e) => setStartingBid(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        <Input
          placeholder="Enter auction duration in seconds"
          value={auctionDuration}
          onChange={(e) => setAuctionDuration(e.target.value)}
          style={{ marginBottom: 20 }}
        />
        <Row justify="end">
          <Button onClick={() => setIsAuctionModalVisible(false)} style={{ marginRight: 10 }}>
            Cancel
          </Button>
          <Button type="primary" onClick={handleConfirmAuction} icon={<CheckOutlined />}>
            Confirm Auction
          </Button>
        </Row>
      </Modal>

      {/* Place Bid Modal */}
      <Modal
        title="Place Bid"
        visible={isBidModalVisible}
        onCancel={() => setIsBidModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Input
          placeholder="Enter bid amount in APT"
          value={bidAmount}
          onChange={(e) => setBidAmount(e.target.value)}
          style={{ marginBottom: 20 }}
        />
        <Row justify="end">
          <Button onClick={() => setIsBidModalVisible(false)} style={{ marginRight: 10 }}>
            Cancel
          </Button>
          <Button type="primary" onClick={handlePlaceBid} icon={<CheckOutlined />}>
            Place Bid
          </Button>
        </Row>
      </Modal>

      {/* Buy Modal */}
      <Modal
        title="Confirm Purchase"
        visible={isBuyModalVisible}
        onOk={handleConfirmPurchase}
        onCancel={handleCancelBuy}
        okText="Confirm"
        cancelText="Cancel"
      >
        <p>Are you sure you want to buy this NFT?</p>
        <p>Price: {nftDetails?.price} APT</p>
      </Modal>
    </div>
  );
};

export default NFTDetail;
