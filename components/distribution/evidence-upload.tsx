"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api/client";

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

/**
 * Signed-upload flow (PRD §10.3): fetch a short-lived signature scoped to this
 * distribution, upload straight to Cloudinary (the API secret never touches
 * the browser), then record the resulting publicId so the server can verify
 * the asset actually exists before trusting it as evidence.
 */
export function EvidenceUpload({ distributionId }: { distributionId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const { data: sig } = await apiGet<UploadSignature>(
        `/api/v1/distributions/${distributionId}/evidence`,
      );

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sig.apiKey);
      formData.append("timestamp", String(sig.timestamp));
      formData.append("signature", sig.signature);
      formData.append("folder", sig.folder);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`,
        { method: "POST", body: formData },
      );
      const uploaded = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(
          uploaded?.error?.message ?? "Upload ke Cloudinary gagal.",
        );
      }

      await apiPost(`/api/v1/distributions/${distributionId}/evidence`, {
        publicId: uploaded.public_id,
      });

      toast.success("Bukti pengiriman berhasil diunggah.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal mengunggah bukti.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,.doc,.docx"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Mengunggah..." : "Unggah Bukti"}
      </Button>
    </div>
  );
}
