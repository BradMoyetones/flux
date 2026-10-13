import type { SVGProps } from "react"

export function FluxMark(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M13 30c-4 0-7-2.7-7-6s3-6 7-6c5.5 0 9 12 15 12 4 0 7-2.7 7-6" />
            <path d="M35 18c4 0 7 2.7 7 6" opacity={0.45} />
            <path d="M13 18c5.5 0 9 12 15 12" opacity={0.45} />
        </svg>
    )
}
