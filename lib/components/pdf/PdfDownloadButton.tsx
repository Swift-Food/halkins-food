"use client";

import React, { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { CateringMenuPdf, CateringMenuPdfProps } from "./CateringMenuPdf";
import PdfDownloadModal from "@/lib/components/catering/modals/PdfDownloadModal";

interface PdfDownloadButtonProps extends Omit<CateringMenuPdfProps, 'showPrices'> {
  filename?: string;
  className?: string;
  children?: React.ReactNode;
  /** If true, skips the modal and downloads with prices directly (legacy behavior) */
  skipModal?: boolean;
  /** Default showPrices value when skipModal is true */
  showPrices?: boolean;
}

export const PdfDownloadButton: React.FC<PdfDownloadButtonProps> = ({
  sessions,
  showPrices = true,
  deliveryCharge,
  totalPrice,
  logoUrl,
  filename = "catering-menu.pdf",
  className,
  children,
  skipModal = false,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleDownload = async (withPrices: boolean) => {
    setIsGenerating(true);
    try {
      const blob = await pdf(
        <CateringMenuPdf
          sessions={sessions}
          showPrices={withPrices}
          deliveryCharge={deliveryCharge}
          totalPrice={totalPrice}
          logoUrl={logoUrl}
        />
      ).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // Add suffix based on price option
      const baseName = filename.replace('.pdf', '');
      link.download = withPrices ? `${baseName}-with-prices.pdf` : `${baseName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setShowModal(false);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClick = () => {
    if (skipModal) {
      handleDownload(showPrices);
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isGenerating}
        className={
          className ||
          "btn btn-primary"
        }
      >
        {isGenerating ? (
          <>
            <span className="loading loading-spinner loading-sm"></span>
            Generating...
          </>
        ) : (
          children || "Download Menu PDF"
        )}
      </button>

      {showModal && (
        <PdfDownloadModal
          onDownload={handleDownload}
          onClose={() => setShowModal(false)}
          isGenerating={isGenerating}
        />
      )}
    </>
  );
};

export default PdfDownloadButton;
