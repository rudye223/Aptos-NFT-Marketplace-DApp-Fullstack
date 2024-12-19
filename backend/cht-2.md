address 0x7c29f596c48bda131bfef7b2462c71dbf8fa8e201675629a5177d6af4316ff69 {
module NFTMarketplace {
    use 0x1::signer;
    use 0x1::vector;
    use 0x1::timestamp;
    use 0x1::string;

    const E_CHAT_DOES_NOT_EXIST: u64 = 601;
    const E_UNAUTHORIZED_CHAT_ACCESS: u64 = 600;

    struct Chat has key, store, copy {
        id: u64,
        participants: vector<address>,
        messages: vector<Message>,
        last_message_id: u64,
    }

    struct Message has store, copy, drop {
        id: u64,
        sender: address,
        content: string::String,
        timestamp: u64,
    }

    // Shared global resource for chats
    struct SharedChats has key {
        chats: vector<Chat>,
    }

    // Initialize the shared chats resource
    public entry fun initialize_shared_chats(account: &signer) {
        let owner = signer::address_of(account);
        assert!(!exists<SharedChats>(owner), E_CHAT_DOES_NOT_EXIST);
        move_to(account, SharedChats { chats: vector::empty() });
    }

    // Create a new chat between two users
    public entry fun create_chat(
        account: &signer,
        recipient: address
    ) acquires SharedChats {
        let sender = signer::address_of(account);
        let chat_id = timestamp::now_seconds();

        // Ensure the shared chats resource exists
        if (!exists<SharedChats>(sender)) {
            initialize_shared_chats(account);
        };

        let participants = vector::empty<address>();
        vector::push_back(&mut participants, sender);
        vector::push_back(&mut participants, recipient);

        let new_chat = Chat {
            id: chat_id,
            participants,
            messages: vector::empty(),
            last_message_id: 0,
        };

        let shared_chats = borrow_global_mut<SharedChats>(sender);
        vector::push_back(&mut shared_chats.chats, new_chat);
    }

    // Send a message to a specific chat
    public entry fun send_message(
        account: &signer,
        chat_id: u64,
        content: string::String
    ) acquires SharedChats {
        let sender = signer::address_of(account);
        let shared_chats = borrow_global_mut<SharedChats>(sender);
        let chats = &mut shared_chats.chats;

        let found = false;
        let i = 0;
        while (i < vector::length(chats)) {
            let chat = vector::borrow_mut(chats, i);
            if (chat.id == chat_id) {
                assert!(is_participant(chat, sender), E_UNAUTHORIZED_CHAT_ACCESS);

                let message_id = chat.last_message_id + 1;
                let new_message = Message {
                    id: message_id,
                    sender,
                    content,
                    timestamp: timestamp::now_seconds(),
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

    // Helper function to check if a user is a participant
    fun is_participant(chat: &Chat, user: address): bool {
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

    // Get all messages in a chat
    #[view]
    public fun get_chat_messages(
        user_address: address,
        chat_id: u64
    ): vector<Message> acquires SharedChats {
        let shared_chats = borrow_global<SharedChats>(user_address);
        let chats = &shared_chats.chats;

        let messages = vector::empty<Message>();
        let found = false;
        let i = 0;
        while (i < vector::length(chats)) {
            let chat = vector::borrow(chats, i);
            if (chat.id == chat_id) {
                let j = 0;
                while (j < vector::length(&chat.messages)) {
                    vector::push_back(&mut messages, *vector::borrow(&chat.messages, j));
                    j = j + 1;
                };
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, E_CHAT_DOES_NOT_EXIST);
        return messages
    }

    #[view]
public fun get_user_chats_view(
    user_address: address
): vector<Chat> acquires SharedChats {
    assert!(exists<SharedChats>(user_address), E_CHAT_DOES_NOT_EXIST);

    let shared_chats = borrow_global<SharedChats>(user_address);
    let all_chats = &shared_chats.chats;

    let user_chats = vector::empty<Chat>();
    let i = 0;

    // Filter chats to include only those where the user is a participant
    while (i < vector::length(all_chats)) {
        let chat = vector::borrow(all_chats, i);
        if (is_participant(chat, user_address)) {
            vector::push_back(&mut user_chats, *chat); // Copy chat to user's chat list
        };
        i = i + 1;
    };

    return user_chats
}

}
}
