import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Button,
    Input,
    Card,
    Spin,
    message,
    List,
    Typography,
    Avatar,
    Row,
    Col,
    Divider,
} from "antd";
import { AptosClient } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { MARKET_PLACE_ADDRESS, MARKET_PLACE_NAME } from "../Constants";
import { SendOutlined, MessageOutlined } from "@ant-design/icons";
import CryptoJS from 'crypto-js';

const { Text, Title } = Typography;

const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

interface Chat1 {
    id: string;
    participants: string[];
    messages: Message1[];
    last_message_id: number;
}

interface Message1 {
    id: number;
    sender: string;
    content: string;
    timestamp: number;
}


const ChatPage: React.FC = () => {
    const { account } = useWallet();
    const [loading, setLoading] = useState(false);
    const [chats, setChats] = useState<Chat1[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat1 | null>(null);
    const [messages, setMessages] = useState<Message1[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [recipientAddress, setRecipientAddress] = useState("");
    const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
    const messageListRef = useRef<HTMLDivElement>(null);
    const secretKey = process.env.REACT_APP_SECRET_KEY || "default-secret-key";
    const [isInitialized, setIsInitialized] = useState(false);
    const [initializationLoading, setInitializationLoading] = useState(false);



    useEffect(() => {
        if (account) {
            checkUserInitialization();
        }
    }, [account]);


    const checkUserInitialization = async () => {
        if (!account) return;
        setLoading(true);
        try {
             const response = await client.view({
                function: `${MARKET_PLACE_ADDRESS}::${MARKET_PLACE_NAME}::is_user_initialized`,
                 type_arguments: [],
                arguments: [account.address],
            });
            setIsInitialized(response[0] === true);
        } catch (error) {
             console.error("Error checking initialization:", error);
           message.error("Failed to check user initialization.");
        } finally {
           setLoading(false);
        }
     };

      const initializeUser = async () => {
        if (!account) return;
         setInitializationLoading(true);
        setTransactionStatus("pending")
        try {
             const entryFunctionPayload = {
                type: "entry_function_payload",
                function: `${MARKET_PLACE_ADDRESS}::${MARKET_PLACE_NAME}::initialize_shared_chats`,
                type_arguments: [],
                arguments: [],
             };

            const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
            message.success(`Transaction ${response.hash} submitted`);
             await client.waitForTransaction(response.hash);
            message.success("User initialized successfully!");
            setTransactionStatus("success")
           setIsInitialized(true);

        } catch (error) {
           console.error("Failed to initialize user", error);
             message.error("Failed to initialize user.");
           setTransactionStatus("error");
        } finally {
             setInitializationLoading(false);
             setTimeout(() => {
                setTransactionStatus(null);
            }, 3000);
        }
    };



    useEffect(() => {
        if (account && isInitialized) {
             fetchChats();
        }
    }, [account, isInitialized]);


     const scrollToBottom = () => {
        if (messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    };

    const decryptMessage = (encryptedMessage: string): string => {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedMessage, secretKey);
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error("Error decrypting the message:", error);
            return encryptedMessage;
        }
    };

    const fetchMessages = useCallback(async (chatId: string) => {
        if (!account) return;
        setLoading(true);
        try {
            const response = await client.view({
                function: `${MARKET_PLACE_ADDRESS}::${MARKET_PLACE_NAME}::get_chat_messages`,
                type_arguments: [],
                arguments: [account.address, chatId],
            });
           if (response && response.length > 0 && response[0].length > 0) {
               const decryptedMessages = await Promise.all(response[0].map(async (msg: any) => ({
                   ...msg,
                   content: decryptMessage(msg.content),
               })));
              setMessages(decryptedMessages as Message1[]);
         }
        } catch (error) {
            console.error("Error fetching messages:", error);
            message.error("Failed to fetch messages.");
        } finally {
            setLoading(false);
            scrollToBottom();
        }
    }, [client,   account]);

    useEffect(() => {
        if (selectedChat) {
            fetchMessages(selectedChat.id);
        }
    }, [selectedChat, fetchMessages]);

    const fetchChats = async () => {
        if (!account) return;
        setLoading(true);
        try {
            const response = await client.view({
                function: `${MARKET_PLACE_ADDRESS}::${MARKET_PLACE_NAME}::get_user_chats_view`,
                type_arguments: [],
                arguments: [account.address],
            });
           if (response && response.length > 0 && response[0].length > 0) {
                const parsedChats = response[0].map((chat: any) => ({
                    ...chat,
                    id: chat.id.toString(),
                }));
                setChats(parsedChats as Chat1[]);
            }
        } catch (error) {
            console.error("Error fetching chats:", error);
            message.error("Failed to fetch chats.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateChat = async () => {
        if (!account) return;
        if (!recipientAddress) {
            message.error("Please enter a recipient address.");
            return;
        }
        setTransactionStatus("pending");
        try {
             const entryFunctionPayload = {
                type: "entry_function_payload",
                function: `${MARKET_PLACE_ADDRESS}::${MARKET_PLACE_NAME}::create_chat`,
                type_arguments: [],
                arguments: [recipientAddress],
            };
            const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
            message.success(`Transaction ${response.hash} submitted`);
             await client.waitForTransaction(response.hash);
            message.success("Chat Created Successfully");
           setTransactionStatus("success");
            fetchChats();
           setRecipientAddress("");
        } catch (error) {
            console.error("Failed to create a chat", error);
           message.error("Failed to create a chat");
            setTransactionStatus("error");
        } finally {
            setTimeout(() => {
                setTransactionStatus(null);
            }, 3000);
        }
    };

    const handleSendMessage = async () => {
        if (!account || !selectedChat) return;
        if (!newMessage) return;
        setTransactionStatus("pending");
        try {
             const encryptedMessage = encryptMessage(newMessage, secretKey);
            const entryFunctionPayload = {
                type: "entry_function_payload",
                function: `${MARKET_PLACE_ADDRESS}::${MARKET_PLACE_NAME}::send_message`,
                type_arguments: [],
                 arguments: [selectedChat.id, encryptedMessage],
             };
           const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
             message.success(`Transaction ${response.hash} submitted`);
             await client.waitForTransaction(response.hash);
             message.success("Message sent successfully!");
            setTransactionStatus("success");
            fetchMessages(selectedChat.id);
            setNewMessage("");
        } catch (error) {
            console.error("Failed to send message.", error);
           message.error("Failed to send message.");
            setTransactionStatus("error");
        } finally {
            setTimeout(() => {
                setTransactionStatus(null);
            }, 3000);
        }
    };


    const encryptMessage = (message: string, secretKey: string): string => {
        return CryptoJS.AES.encrypt(message, secretKey).toString();
    };

    if (loading) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                }}
            >
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div
            style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Title level={3} style={{ marginBottom: "20px", textAlign: "center" }}>
                Chat
            </Title>
            {transactionStatus === "pending" && <Spin />}
            {transactionStatus === "success" && <Text type={"success"}>Success</Text>}
            {transactionStatus === "error" && <Text type={"danger"}>Error</Text>}
            {!isInitialized ? (
                 <div style={{textAlign:'center'}}>
                    <Text>It seems that you have not initialized your chat account. </Text>
                   <Button type="primary"  onClick={initializeUser} loading={initializationLoading}>Initialize</Button>
               </div>
          ) : (
            <Row gutter={[16, 16]} style={{ width: "100%", maxWidth: "800px" }}>
                <Col span={8}>
                    <Card title="Chats" style={{ height: "100%", overflowY: "auto" }}>
                        <List
                            itemLayout="horizontal"
                            dataSource={chats}
                            renderItem={(chat) => (
                                <List.Item
                                    onClick={() => {
                                        setSelectedChat(chat);
                                    }}
                                    style={{
                                        cursor: "pointer",
                                        backgroundColor:
                                            selectedChat?.id === chat.id ? "#f0f0f0" : "white",
                                    }}
                                >
                                    <List.Item.Meta
                                       avatar={<Avatar icon={<MessageOutlined />} />}
                                       title={
                                           <Text>
                                               {chat.participants.find(
                                                   (p) => p !== account?.address
                                               ) || "New Chat"}
                                            </Text>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                        <Divider />
                        <Input
                            placeholder="Recipient Address"
                            value={recipientAddress}
                            onChange={(e) => setRecipientAddress(e.target.value)}
                        />
                        <Button
                            type="primary"
                            style={{ marginTop: "10px" }}
                            onClick={handleCreateChat}
                            block
                        >
                            Create Chat
                        </Button>
                    </Card>
                </Col>
                <Col span={16}>
                    <Card title={selectedChat ? "Chat Messages" : "Select a chat"} style={{ height: "100%", overflowY: "auto" }}>
                        {selectedChat ? (
                            <>
                                <div  ref={messageListRef} style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                                <List
                                    itemLayout="vertical"
                                    dataSource={messages}
                                    renderItem={(messageItem) => (
                                        <List.Item>
                                            <List.Item.Meta
                                                  avatar={<Avatar>{messageItem.sender === account?.address ? "You" : messageItem.sender.slice(0, 8)}</Avatar>}
                                                  description={
                                                      <Text type="secondary">{new Date(messageItem.timestamp * 1000).toLocaleString()}</Text>
                                                  }
                                              />
                                           <Text>{messageItem.content}</Text>
                                          </List.Item>
                                     )}
                                />
                                    </div>
                                <Divider />
                                <Row gutter={16}>
                                    <Col span={18}>
                                        <Input
                                            placeholder="Enter message"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                        />
                                    </Col>
                                    <Col span={6}>
                                        <Button
                                            type="primary"
                                            onClick={handleSendMessage}
                                            icon={<SendOutlined />}
                                            block
                                        >
                                            Send
                                        </Button>
                                    </Col>
                                </Row>
                            </>
                        ) : (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "100%",
                                }}
                            >
                                <Text type="secondary" style={{ fontSize: "1.2em" }}>
                                    Select a chat to view messages.
                                </Text>
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>
            )}
        </div>
    );
};

export default ChatPage;