#[test_only]
module NFTMarketplace::NFTMarketplaceTests {
    use std::unit_test;
    use std::vector;
    use std::signer;
    use NFTMarketplace::NFTMarketplace;

    // Helper function to create two signers
    fun create_two_signers(): (signer, signer) {
        let signers = &mut unit_test::create_signers_for_testing(2);
        let (alice, bob) = (vector::pop_back(signers), vector::pop_back(signers));
        (alice, bob)
    }

    #[test]
    public entry fun test_chat_creation_and_message_sending() {
        let (alice, bob) = create_two_signers();
        let alice_addr = signer::address_of(&alice);
        let bob_addr = signer::address_of(&bob);

        // Initialize shared chats for both signers
        NFTMarketplace::initialize_shared_chats(&alice);
        NFTMarketplace::initialize_shared_chats(&bob);

        // Create a chat between Alice and Bob
        NFTMarketplace::create_chat(&alice, bob_addr);

        // Verify both Alice and Bob can see the chat
        let alice_chats = NFTMarketplace::get_user_chats_view(alice_addr);
        let bob_chats = NFTMarketplace::get_user_chats_view(bob_addr);
        assert!(vector::length(&alice_chats) == 1, 101);
        assert!(vector::length(&bob_chats) == 1, 102);

        // Retrieve the chat_id using a public getter function
        let chat_id = if (vector::length(&alice_chats) > 0) {
            let chat = vector::borrow(&alice_chats, 0); // Get the first chat
            NFTMarketplace::get_chat_id(&chat) // Use the getter function for `id`
        } else {
            // Handle the error if no chats are found (optional)
            0 // or some error handling
        };

        // Send a message in the chat
        let message_content = b"Hello, Bob!".to_vec(); // Byte vector directly
        NFTMarketplace::send_message(&alice, chat_id, message_content);

        // Verify both Alice and Bob can see the message
        let alice_messages = NFTMarketplace::get_chat_messages(alice_addr, chat_id);
        let bob_messages = NFTMarketplace::get_chat_messages(bob_addr, chat_id);
        assert!(vector::length(&alice_messages) == 1, 103);
        assert!(vector::length(&bob_messages) == 1, 104);
    }
}
