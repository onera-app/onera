<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { v4 as uuidv4 } from 'uuid';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	import { useChatQuery, useCreateChatMutation, useUpdateChatMutation, type Chat as ChatType, type ChatHistoryMessage } from '$lib/api/chats';
	import { useCredentialsQuery } from '$lib/api/credentials';
	import { DirectLLMClient, type ChatMessage, type StreamUpdate } from '$lib/llm';
	import { selectedModel, models } from '$lib/stores';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';

	interface Props {
		chatId?: string;
	}

	let { chatId }: Props = $props();

	// State
	let messageInput = $state('');
	let isStreaming = $state(false);
	let currentStreamContent = $state('');
	let messagesContainer: HTMLDivElement | null = $state(null);
	let abortController: AbortController | null = null;

	// Queries
	const chatQuery = useChatQuery(chatId);
	const credentialsQuery = useCredentialsQuery();
	const createMutation = useCreateChatMutation();
	const updateMutation = useUpdateChatMutation();

	// Derived state
	let chat = $derived($chatQuery.data);
	let messages = $derived(chat ? getMessageChain(chat.history) : []);
	let llmClient = $state<DirectLLMClient | null>(null);

	// Initialize LLM client when credentials are available
	$effect(() => {
		if ($credentialsQuery.data && $credentialsQuery.data.length > 0) {
			const credentials = $credentialsQuery.data.map(c => ({
				id: c.id,
				provider: c.provider as 'openai' | 'ollama' | 'anthropic' | 'azure' | 'custom',
				name: c.name,
				apiKey: c.api_key,
				baseUrl: c.base_url || '',
				orgId: c.org_id
			}));
			llmClient = new DirectLLMClient(credentials);
			
			// Update available models
			llmClient.listAllModels().then(modelList => {
				models.set(modelList);
				if (!$selectedModel && modelList.length > 0) {
					selectedModel.set(modelList[0].id);
				}
			});
		}
	});

	function getMessageChain(history: ChatType['history']): ChatHistoryMessage[] {
		if (!history || !history.currentId) return [];
		
		const chain: ChatHistoryMessage[] = [];
		let currentId: string | null = history.currentId;
		
		while (currentId) {
			const msg = history.messages[currentId];
			if (msg) {
				chain.unshift(msg);
				currentId = msg.parentId;
			} else {
				break;
			}
		}
		
		return chain;
	}

	async function handleSend() {
		if (!messageInput.trim() || isStreaming) return;
		if (!llmClient || !$selectedModel) {
			toast.error('No LLM credentials configured');
			return;
		}

		const userMessage = messageInput.trim();
		messageInput = '';
		isStreaming = true;
		currentStreamContent = '';

		try {
			// Create or update chat
			let currentChat = chat;
			let history = currentChat?.history || { messages: {}, currentId: null };

			// Add user message
			const userMsgId = uuidv4();
			const userMsg: ChatHistoryMessage = {
				id: userMsgId,
				parentId: history.currentId,
				childrenIds: [],
				role: 'user',
				content: userMessage,
				timestamp: Date.now()
			};

			history.messages[userMsgId] = userMsg;
			if (history.currentId && history.messages[history.currentId]) {
				history.messages[history.currentId].childrenIds.push(userMsgId);
			}
			history.currentId = userMsgId;

			// Create assistant message placeholder
			const assistantMsgId = uuidv4();
			const assistantMsg: ChatHistoryMessage = {
				id: assistantMsgId,
				parentId: userMsgId,
				childrenIds: [],
				role: 'assistant',
				content: '',
				timestamp: Date.now(),
				model: $selectedModel
			};

			history.messages[assistantMsgId] = assistantMsg;
			history.messages[userMsgId].childrenIds.push(assistantMsgId);
			history.currentId = assistantMsgId;

			// Create new chat if needed
			if (!chatId) {
				const result = await $createMutation.mutateAsync({
					title: userMessage.slice(0, 50),
					history
				});
				goto(`/chat/${result.id}`);
				return;
			}

			// Build messages for LLM
			const apiMessages: ChatMessage[] = getMessageChain(history)
				.filter(m => m.role !== 'assistant' || m.content)
				.map(m => ({
					role: m.role,
					content: m.content
				}));

			// Stream response
			abortController = new AbortController();
			
			for await (const update of llmClient.streamChatCompletion(
				{ model: $selectedModel, messages: apiMessages },
				undefined,
				abortController.signal
			)) {
				if (update.error) {
					toast.error(update.error);
					break;
				}

				if (update.value) {
					currentStreamContent += update.value;
					history.messages[assistantMsgId].content = currentStreamContent;
				}

				if (update.done) {
					break;
				}

				await tick();
				scrollToBottom();
			}

			// Save chat
			await $updateMutation.mutateAsync({
				id: chatId,
				chat: { title: userMessage.slice(0, 50), history }
			});

		} catch (error) {
			if (error instanceof Error && error.name !== 'AbortError') {
				toast.error(error.message);
			}
		} finally {
			isStreaming = false;
			currentStreamContent = '';
			abortController = null;
		}
	}

	function handleStop() {
		if (abortController) {
			abortController.abort();
		}
	}

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	function renderMarkdown(content: string): string {
		return DOMPurify.sanitize(marked.parse(content) as string);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	onMount(() => {
		scrollToBottom();
	});
</script>

<div class="flex h-screen bg-slate-900">
	<Sidebar />
	
	<main class="flex-1 flex flex-col">
		<!-- Header -->
		<header class="border-b border-slate-700 p-4 flex items-center justify-between">
			<h1 class="text-lg font-medium text-white truncate">
				{chat?.title || 'New Chat'}
			</h1>
			
			<!-- Model Selector -->
			<select
				class="input w-48"
				bind:value={$selectedModel}
				disabled={isStreaming}
			>
				{#if $models.length === 0}
					<option value="">No models available</option>
				{:else}
					{#each $models as model}
						<option value={model.id}>{model.name}</option>
					{/each}
				{/if}
			</select>
		</header>

		<!-- Messages -->
		<div
			bind:this={messagesContainer}
			class="flex-1 overflow-y-auto p-4 space-y-4"
		>
			{#if messages.length === 0 && !chatId}
				<div class="flex-1 flex items-center justify-center h-full">
					<div class="text-center">
						<h2 class="text-2xl font-bold text-white mb-2">Start a New Conversation</h2>
						<p class="text-slate-400">Your messages are end-to-end encrypted</p>
					</div>
				</div>
			{:else}
				{#each messages as message}
					<div class="flex gap-3 {message.role === 'user' ? 'justify-end' : ''}">
						<div class="max-w-2xl {message.role === 'user' 
							? 'bg-blue-600 text-white' 
							: 'bg-slate-700 text-slate-100'} rounded-lg px-4 py-3">
							{#if message.role === 'assistant'}
								<div class="prose prose-invert prose-sm max-w-none">
									{@html renderMarkdown(message.content)}
								</div>
							{:else}
								<p class="whitespace-pre-wrap">{message.content}</p>
							{/if}
						</div>
					</div>
				{/each}

				{#if isStreaming && currentStreamContent}
					<div class="flex gap-3">
						<div class="max-w-2xl bg-slate-700 text-slate-100 rounded-lg px-4 py-3">
							<div class="prose prose-invert prose-sm max-w-none">
								{@html renderMarkdown(currentStreamContent)}
							</div>
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<!-- Input -->
		<div class="border-t border-slate-700 p-4">
			<div class="max-w-3xl mx-auto flex gap-3">
				<textarea
					bind:value={messageInput}
					onkeydown={handleKeydown}
					placeholder="Type your message..."
					class="input flex-1 resize-none h-12 py-3"
					disabled={isStreaming}
					rows="1"
				></textarea>
				
				{#if isStreaming}
					<button
						class="btn btn-danger"
						onclick={handleStop}
					>
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				{:else}
					<button
						class="btn btn-primary"
						onclick={handleSend}
						disabled={!messageInput.trim() || !llmClient}
					>
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
						</svg>
					</button>
				{/if}
			</div>
		</div>
	</main>
</div>
