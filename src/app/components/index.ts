// UI primitives
export { IconButton, type ButtonType } from "@/components/ui/button";
export { InputRange } from "@/components/ui/input-range";
export { Avatar, AvatarPicker, getEmojiUrl } from "@/components/ui/emoji";
export {
  Popover,
  Card,
  ListItem,
  List,
  Modal,
  showToast,
  showConfirm,
  PasswordInput,
  Selector,
} from "@/components/ui/ui-lib";

// Chat
export { Chat } from "./chat/chat";
export { ChatList, ChatItem } from "./chat/chat-list";
export { MessageSelector, useMessageSelector } from "./chat/message-selector";
export { SearchChatPage } from "./chat/search-chat";
export { ErrorBoundary } from "./chat/error";

// Settings
export { Settings } from "./settings/settings";
export { ModelConfigList } from "./settings/model-config";
export { TTSConfigList } from "./settings/tts-config";

// Layout
export { Home, Loading, useSwitchTheme, WindowContent } from "./layout/home";
export { SideBarContainer, useHotKey, useDragSideBar } from "./layout/sidebar";

// Auth
export { AuthPage } from "@/features/authentication/components/auth";
export { NewChat } from "@/features/authentication/components/new-chat";

// Forms
export { MaskPage, MaskAvatar, MaskConfig, ContextPrompts } from "./forms/mask";
export { PluginPage } from "./forms/plugin";

// Features
export { Artifacts, HTMLPreview, ArtifactsShareButton } from "./features/artifacts";
export { ExportMessageModal, MessageExporter, RenderExport } from "./features/exporter";
export { McpMarketPage } from "./features/mcp-market";

// Markdown
export { MarkdownContent, Mermaid, PreCode } from "./markdown/markdown";

// Subdirectories with their own index
export * from "./sd";
export * from "./realtime-chat";
export * from "@/features/voice/components";
