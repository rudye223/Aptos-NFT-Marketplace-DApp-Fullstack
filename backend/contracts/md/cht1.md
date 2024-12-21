address 0x7c29f596c48bda131bfef7b2462c71dbf8fa8e201675629a5177d6af4316ff69 {
    module NFTMarketplace {
        use 0x1::signer;
        use 0x1::vector;
        use 0x1::option;
        use 0x1::timestamp;
        use 0x1::string;
        use 0x1::account;

        const E_NOT_OWNER: u64 = 100;
        const E_CHAT_DOES_NOT_EXIST: u64 = 601;
        const E_UNAUTHORIZED_CHAT_ACCESS: u64 = 600;

        // Struct definitions
        struct Chat1 has key, store, copy {
            id: u64,
            participants: vector<address>,
            messages: vector<Message1>,
            last_message_id: u64
        }

        struct Message1 has store, copy, drop {
            id: u64,
            sender: address,
            content: string::String,
            timestamp: u64
        }

        // Resource definitions
        struct Chats has key {
            chats: vector<Chat1>
        }

       
      
  // Initialize resource for chat
        public fun init_chat(account: &signer) {
            move_to(account, Chats { chats: vector::empty() });
        }

        public entry fun initialize_chat(account: &signer) {
        //init chat
                init_chat(account)
        }
        // Create a new chat between two users
public entry fun create_chat1(account: &signer, recipient: address) acquires Chats {
            let sender = signer::address_of(account);
            let chat_id = timestamp::now_seconds();

            

            let participants = vector::empty<address>();
            vector::push_back(&mut participants, sender);
            vector::push_back(&mut participants, recipient);

            let new_chat = Chat1 {
                id: chat_id,
                participants,
                messages: vector::empty(),
                last_message_id: 0
            };

            // Borrow chats resource for sender and recipient and add the new chat
            let sender_chats = borrow_global_mut<Chats>(sender);
            vector::push_back(&mut sender_chats.chats, new_chat);

            let recipient_chats = borrow_global_mut<Chats>(recipient);
            vector::push_back(&mut recipient_chats.chats, new_chat);
        }



// New view function to get all chats for a given user address
#[view]
public fun get_user_chats_view(user_address: address): vector<Chat1> acquires Chats {
    assert!(exists<Chats>(user_address), E_CHAT_DOES_NOT_EXIST);

    let chats_resource = borrow_global<Chats>(user_address);
    let chats = &chats_resource.chats;

    let chats_copy = vector::empty<Chat1>();
    let i = 0;
    while(i < vector::length(chats)){
        vector::push_back(&mut chats_copy, *vector::borrow(chats, i));
        i = i + 1;
    };

    return chats_copy
}
        // Get all chats for the current user
        
public fun get_user_chats1(account: &signer): vector<Chat1> acquires Chats {
            let sender = signer::address_of(account);
            assert!(exists<Chats>(sender), 0);

            let chats_resource = borrow_global<Chats>(sender);
            let chats = &chats_resource.chats;

            let chats_copy = vector::empty<Chat1>();
            let i = 0;
            while(i < vector::length(chats)){
                vector::push_back(&mut chats_copy, *vector::borrow(chats, i));
                i = i + 1;
            };

            return chats_copy
        }

        public entry fun send_message1(
    account: &signer,
    chat_id: u64,
    content: string::String
) acquires Chats {
    let sender = signer::address_of(account);
    let chats_resource = borrow_global_mut<Chats>(sender);
    let chats = &mut chats_resource.chats;

    let   found = false;
    let i = 0;
    while (i < vector::length(chats)) {
        let chat = vector::borrow_mut(chats, i); // Borrow a mutable reference
        if (chat.id == chat_id) {
               // Check if sender is a participant
            assert!(is_participant(chat, sender), E_UNAUTHORIZED_CHAT_ACCESS); // Corrected the call to is_participant
            let message_id = chat.last_message_id + 1;
            let new_message = Message1 {
                id: message_id,
                sender,
                content,
                timestamp: timestamp::now_seconds()
            };

            vector::push_back(&mut chat.messages, new_message);
            chat.last_message_id = message_id;
            found = true;
            break
        };
        i = i + 1;
    };
    assert!(found, E_CHAT_DOES_NOT_EXIST);
}

        // Get all messages in a chat
        public fun get_chat_messages1(
            account: &signer,
            chat_id: u64
        ): vector<Message1> acquires Chats {
            let sender = signer::address_of(account);
            let chats_resource = borrow_global<Chats>(sender);
            let chats = &chats_resource.chats;

            let found_chat = false;
            let messages = vector::empty<Message1>();
            let i = 0;
            while(i < vector::length(chats)){
                let chat = vector::borrow(chats, i);
                if(chat.id == chat_id){
                    let j = 0;
                    let messages_copy = vector::empty<Message1>();
                    while(j < vector::length(&chat.messages)){
                        vector::push_back(&mut messages_copy, *vector::borrow(&chat.messages, j));
                        j = j + 1;
                    };
                    found_chat = true;
                    break
                };
                i = i + 1;
            };

            assert!(found_chat, E_CHAT_DOES_NOT_EXIST);
            return messages
        }

// Get all messages in a chat
#[view]
public fun get_chat_messages_view(
    user_address: address,
    chat_id: u64
): vector<Message1> acquires Chats {
    let chats_resource = borrow_global<Chats>(user_address);
    let chats = &chats_resource.chats;

    let found_chat = false;
    let messages = vector::empty<Message1>();
    let i = 0;
    while(i < vector::length(chats)){
        let chat = vector::borrow(chats, i);
        if(chat.id == chat_id){
            let j = 0;
            let messages_copy = vector::empty<Message1>();
            while(j < vector::length(&chat.messages)){
                vector::push_back(&mut messages_copy, *vector::borrow(&chat.messages, j));
                j = j + 1;
            };
            found_chat = true;
            return messages_copy // Return the messages from the found chat
        };
        i = i + 1;
    };

    assert!(found_chat, E_CHAT_DOES_NOT_EXIST);
    return messages // This will be an empty vector if no chat is found
}
        // Helper function to check if user is a participant
        fun is_participant(chat: &Chat1, user: address): bool {
            let i = 0;
            let found = false;
            while (i < vector::length(&chat.participants)) {
                if (vector::borrow(&chat.participants, i) == &user) {
                    found = true;
                    break
                };
                i = i + 1;
            };
            return found
        }


    }
}
