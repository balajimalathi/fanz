```txt
{/* Input group */}
<InputGroup className="h-auto">
  {/* Timer in input group - show after chat is enabled */}
  {isEnabled && remainingTime !== null && remainingTime !== undefined && remainingTime > 0 && (
    <InputGroupAddon align="block-start" className="justify-center pb-2 w-full">
      <ConversationTimer
        type="service"
        initialSeconds={90}
        onExpire={() => {
          console.log("Service time expired");
        }}
      />
    </InputGroupAddon>
  )}
  <InputGroupAddon align="inline-start" className="gap-1">
    <InputGroupButton
      variant="ghost"
      size="icon-xs"
      onClick={() => fileInputRef.current?.click()}
      disabled={isSending || !isEnabled}
      type="button"
    >
      <ImageIcon className="h-4 w-4" />
    </InputGroupButton>
    <InputGroupButton
      variant="ghost"
      size="icon-xs"
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "video/*";
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file && onMediaUpload) {
            handleFileSelect({ target: { files: [file] } } as any, "video");
          }
        };
        input.click();
      }}
      disabled={isSending || !isEnabled}
      type="button"
    >
      <Video className="h-4 w-4" />
    </InputGroupButton>
    <InputGroupButton
      variant="ghost"
      size="icon-xs"
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "audio/*";
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file && onMediaUpload) {
            handleFileSelect({ target: { files: [file] } } as any, "audio");
          }
        };
        input.click();
      }}
      disabled={isSending || !isEnabled}
      type="button"
    >
      <Mic className="h-4 w-4" />
    </InputGroupButton>
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => handleFileSelect(e, "image")}
    />
  </InputGroupAddon>
  <InputGroupTextarea
    value={message}
    onChange={handleMessageChange}
    onKeyDown={(e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }}
    placeholder={isEnabled ? "Type a message..." : "Chat is disabled"}
    className="min-h-[44px] max-h-[120px] sm:min-h-[60px] sm:max-h-[200px] resize-none text-sm sm:text-base py-2 outline-none ring-none border-none"
    disabled={isSending || !isEnabled}
  />
  <InputGroupAddon align="inline-end">
    <InputGroupButton
      variant="ghost"
      size="icon-xs"
      onClick={handleSend}
      disabled={isSending || !message.trim() || !isEnabled}
      type="button"
    >
      <Send className="h-4 w-4" />
    </InputGroupButton>
  </InputGroupAddon>
</InputGroup>
```