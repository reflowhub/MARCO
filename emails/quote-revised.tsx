import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Hr,
  Section,
  Column,
  Row,
} from "@react-email/components";

interface QuoteRevisedEmailProps {
  customerName: string;
  deviceName: string;
  originalGrade: string;
  revisedGrade: string;
  originalPrice: number;
  revisedPrice: number;
  currency: string;
  quoteUrl: string;
  expiresAt: string;
  deviceChanged: boolean;
  revisedDeviceName?: string;
}

export default function QuoteRevisedEmail({
  customerName,
  deviceName,
  originalGrade,
  revisedGrade,
  originalPrice,
  revisedPrice,
  currency,
  quoteUrl,
  expiresAt,
  deviceChanged,
  revisedDeviceName,
}: QuoteRevisedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={heading}>rhex</Text>
          <Text style={paragraph}>Hi {customerName},</Text>
          <Text style={paragraph}>
            We&apos;ve received and inspected your device. After inspection, we
            found that it differs from the original quote. Please review the
            changes below.
          </Text>

          <Section style={comparisonSection}>
            <Row>
              <Column style={comparisonColumn}>
                <Text style={comparisonLabel}>Original Quote</Text>
                <Text style={comparisonDevice}>{deviceName}</Text>
                <Text style={comparisonDetail}>Grade {originalGrade}</Text>
                <Text style={comparisonPrice}>
                  ${originalPrice.toFixed(2)} {currency}
                </Text>
              </Column>
              <Column style={comparisonColumn}>
                <Text style={comparisonLabel}>Revised Quote</Text>
                <Text style={comparisonDevice}>
                  {deviceChanged && revisedDeviceName
                    ? revisedDeviceName
                    : deviceName}
                </Text>
                <Text style={comparisonDetail}>Grade {revisedGrade}</Text>
                <Text style={comparisonPriceRevised}>
                  ${revisedPrice.toFixed(2)} {currency}
                </Text>
              </Column>
            </Row>
          </Section>

          <Text style={paragraph}>
            Please accept or reject this revised offer by{" "}
            <strong>{expiresAt}</strong>. If we don&apos;t hear from you by
            then, your device will be returned to you.
          </Text>

          <Text style={{ textAlign: "center" as const, margin: "24px 0" }}>
            <a href={quoteUrl} style={actionButton}>
              Review &amp; Respond
            </a>
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            If you have any questions, reply to this email or contact us at
            rhex.app.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "40px auto",
  padding: "32px",
  borderRadius: "8px",
  maxWidth: "480px",
};

const heading = {
  fontSize: "20px",
  fontWeight: "700" as const,
  color: "#111827",
  marginBottom: "24px",
};

const paragraph = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#374151",
};

const comparisonSection = {
  margin: "24px 0",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  overflow: "hidden" as const,
};

const comparisonColumn = {
  padding: "16px",
  verticalAlign: "top" as const,
  width: "50%",
};

const comparisonLabel = {
  fontSize: "11px",
  fontWeight: "600" as const,
  textTransform: "uppercase" as const,
  color: "#9ca3af",
  marginBottom: "8px",
};

const comparisonDevice = {
  fontSize: "14px",
  fontWeight: "600" as const,
  color: "#111827",
  marginBottom: "4px",
};

const comparisonDetail = {
  fontSize: "13px",
  color: "#6b7280",
  marginBottom: "8px",
};

const comparisonPrice = {
  fontSize: "16px",
  fontWeight: "700" as const,
  color: "#374151",
};

const comparisonPriceRevised = {
  fontSize: "16px",
  fontWeight: "700" as const,
  color: "#d97706",
};

const actionButton = {
  backgroundColor: "#111827",
  color: "#ffffff",
  padding: "12px 32px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: "600" as const,
  textDecoration: "none",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footer = {
  fontSize: "12px",
  color: "#9ca3af",
};
