export type Phase = 'Discovery' | 'Testing' | 'POC' | 'Migration' | 'Deadline' | 'Standardization';

export interface TimelineEvent {
    year: number;
    quarter?: string;
    phase: Phase;
    title: string;
    description: string;
    sourceUrl: string;
    sourceDate: string;
}

export interface RegulatoryBody {
    name: string;
    fullName: string;
    countryCode: string;
    events: TimelineEvent[];
}

export interface CountryData {
    countryName: string;
    flagCode: string;
    bodies: RegulatoryBody[];
}

export const timelineData: CountryData[] = [
    {
        countryName: "United States",
        flagCode: "US",
        bodies: [
            {
                name: "NIST",
                fullName: "National Institute of Standards and Technology",
                countryCode: "US",
                events: [
                    {
                        year: 2024,
                        phase: "Standardization",
                        title: "FIPS 203, 204, 205 Published",
                        description: "NIST releases the first set of PQC standards for ML-KEM, ML-DSA, and SLH-DSA.",
                        sourceUrl: "https://csrc.nist.gov/pubs/fips/203/final",
                        sourceDate: "2024-08-13"
                    },
                    {
                        year: 2030,
                        phase: "Deadline",
                        title: "Deprecation of 112-bit Security",
                        description: "Legacy algorithms offering less than 112-bit security (e.g., RSA-2048) are deprecated.",
                        sourceUrl: "https://csrc.nist.gov/projects/post-quantum-cryptography",
                        sourceDate: "2024-01-01"
                    },
                    {
                        year: 2035,
                        phase: "Migration",
                        title: "Full Migration Deadline (NSM-10)",
                        description: "Mandatory migration to quantum-resistant cryptography for all National Security Systems.",
                        sourceUrl: "https://www.whitehouse.gov/briefing-room/presidential-actions/2022/05/04/national-security-memorandum-on-promoting-united-states-leadership-in-quantum-computing-and-mitigating-risks-to-vulnerable-cryptographic-systems/",
                        sourceDate: "2022-05-04"
                    }
                ]
            }
        ]
    },
    {
        countryName: "United Kingdom",
        flagCode: "GB",
        bodies: [
            {
                name: "NCSC",
                fullName: "National Cyber Security Centre",
                countryCode: "GB",
                events: [
                    {
                        year: 2028,
                        phase: "Discovery",
                        title: "Discovery & Initial Plan Complete",
                        description: "Organizations should have completed discovery of cryptographic assets and initial migration planning.",
                        sourceUrl: "https://www.ncsc.gov.uk/whitepaper/next-steps-preparing-for-post-quantum-cryptography",
                        sourceDate: "2023-11-01"
                    },
                    {
                        year: 2035,
                        phase: "Migration",
                        title: "Full Migration Complete",
                        description: "Target for all systems to be fully migrated to PQC.",
                        sourceUrl: "https://www.ncsc.gov.uk/whitepaper/next-steps-preparing-for-post-quantum-cryptography",
                        sourceDate: "2023-11-01"
                    }
                ]
            }
        ]
    },
    {
        countryName: "Germany",
        flagCode: "DE",
        bodies: [
            {
                name: "BSI",
                fullName: "Federal Office for Information Security",
                countryCode: "DE",
                events: [
                    {
                        year: 2030,
                        phase: "Migration",
                        title: "Protection of Sensitive Data",
                        description: "Defense against 'Store Now, Decrypt Later' attacks for long-term confidential data.",
                        sourceUrl: "https://www.bsi.bund.de/EN/Themen/Unternehmen-und-Organisationen/Informationen-und-Empfehlungen/Quantentechnologien-und-Post-Quanten-Kryptografie/Post-Quanten-Kryptografie/post-quanten-kryptografie_node.html",
                        sourceDate: "2023-01-01"
                    }
                ]
            }
        ]
    },
    {
        countryName: "France",
        flagCode: "FR",
        bodies: [
            {
                name: "ANSSI",
                fullName: "National Cybersecurity Agency of France",
                countryCode: "FR",
                events: [
                    {
                        year: 2025,
                        phase: "Discovery",
                        title: "Phase 1: Hybrid Solutions",
                        description: "Recommendation to use hybrid cryptography (Classical + Pre-standard PQC) for defense-in-depth.",
                        sourceUrl: "https://cyber.gouv.fr/en/publications/anssi-views-post-quantum-cryptography-transition",
                        sourceDate: "2022-01-01"
                    },
                    {
                        year: 2030,
                        phase: "Migration",
                        title: "Phase 3: Standalone PQC",
                        description: "Transition to standalone PQC algorithms as confidence in standards matures.",
                        sourceUrl: "https://cyber.gouv.fr/en/publications/anssi-views-post-quantum-cryptography-transition",
                        sourceDate: "2022-01-01"
                    }
                ]
            }
        ]
    },
    {
        countryName: "China",
        flagCode: "CN",
        bodies: [
            {
                name: "CAC/SCA",
                fullName: "Cyberspace Administration of China / State Cryptography Administration",
                countryCode: "CN",
                events: [
                    {
                        year: 2025,
                        phase: "Standardization",
                        title: "Call for PQC Proposals",
                        description: "Initiative to establish national PQC standards independent of NIST.",
                        sourceUrl: "https://www.sca.gov.cn/",
                        sourceDate: "2024-01-01"
                    },
                    {
                        year: 2027,
                        phase: "Migration",
                        title: "Key Sector Migration Start",
                        description: "Anticipated start of migration for Government and Finance sectors.",
                        sourceUrl: "https://www.sca.gov.cn/",
                        sourceDate: "2024-01-01"
                    }
                ]
            }
        ]
    }
];
