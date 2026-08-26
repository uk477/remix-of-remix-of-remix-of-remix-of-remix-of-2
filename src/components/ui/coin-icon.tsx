'use client'

import type { CSSProperties, ReactElement } from 'react'

import usdtAsset from '@/assets/coins/usdt.png'
import usdcAsset from '@/assets/coins/usdc.png'
import dogeAsset from '@/assets/coins/doge.png'
import xrpAsset from '@/assets/coins/xrp.png'
import polAsset from '@/assets/coins/pol.png'
import btcAsset from '@/assets/coins/btc.png'
import gramAsset from '@/assets/coins/gram.png'



function ImgCoin({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="inline-flex size-full items-center justify-center overflow-hidden rounded-full">
      <img src={src} alt={alt} width="100%" height="100%" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </span>
  )
}



/**
 * CryptoLogo (exported as CoinIcon).
 *
 * Hand-tuned inline SVGs based on official brand marks — no cartoon CDN.
 * Stablecoins (USDT / USDC) render with a small real coin badge for the
 * network (TRC20 → TRX, ERC20 → ETH, BEP20 → BNB, SPL → SOL, TON → TON).
 *
 * Sizing: pass `size` (px) OR a Tailwind `size-N` className. When no
 * explicit `size` is set, icons fill 100% of the parent so utility classes
 * like `size-6`, `size-8` work as expected.
 */

// --- symbol / network normalization ---------------------------------------

const NETWORK_TO_SYMBOL: Record<string, string> = {
  'TRC-20': 'TRX', TRC20: 'TRX', TRON: 'TRX', TRX: 'TRX',
  'ERC-20': 'ETH', ERC20: 'ETH', ETHEREUM: 'ETH', ETH: 'ETH',
  'BEP-20': 'BNB', BEP20: 'BNB', BSC: 'BNB', 'BNB SMART CHAIN': 'BNB', BNB: 'BNB',
  TON: 'GRAM', TONCOIN: 'GRAM', 'THE OPEN NETWORK': 'GRAM', GRAM: 'GRAM',
  BITCOIN: 'BTC', BTC: 'BTC',
  SOLANA: 'SOL', SOL: 'SOL', SPL: 'SOL',
  POLYGON: 'POL', MATIC: 'POL', POL: 'POL',
  LITECOIN: 'LTC', LTC: 'LTC',
  RIPPLE: 'XRP', XRP: 'XRP',
  DOGECOIN: 'DOGE', DOGE: 'DOGE',
  MONERO: 'XMR', XMR: 'XMR',
  DAI: 'DAI',
  BASE: 'BASE', 'BASE MAINNET': 'BASE',
  USDT: 'USDT', USDC: 'USDC',
}

function normalize(input?: string): string | undefined {
  if (!input) return undefined
  const key = input.toUpperCase().replace(/\s+/g, ' ').trim()
  return NETWORK_TO_SYMBOL[key] ?? key
}

// --- inline SVGs ----------------------------------------------------------

function Wrap({ children, bg }: { children: ReactElement; bg: string }) {
  return (
    <span
      className="inline-flex size-full items-center justify-center overflow-hidden rounded-full"
      style={{ background: bg }}
    >
      {children}
    </span>
  )
}

function SvgFull({ viewBox, children }: { viewBox: string; children: ReactElement | ReactElement[] }) {
  return (
    <svg viewBox={viewBox} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden>
      {children}
    </svg>
  )
}

function IconBTC() {
  return <ImgCoin src={btcAsset} alt="BTC" />
}


function IconETH() {
  return (
    <Wrap bg="#627EEA">
      <SvgFull viewBox="0 0 32 32">
        <g fill="#fff">
          <path fillOpacity=".6" d="M16.5 4v8.87l7.5 3.35z" />
          <path d="M16.5 4L9 16.22l7.5-3.35z" />
          <path fillOpacity=".6" d="M16.5 21.97v6.03L24 17.62z" />
          <path d="M16.5 28v-6.03L9 17.62z" />
          <path fillOpacity=".2" d="M16.5 20.57l7.5-4.35-7.5-3.35z" />
          <path fillOpacity=".6" d="M9 16.22l7.5 4.35v-7.7z" />
        </g>
      </SvgFull>
    </Wrap>
  )
}

function IconUSDT() {
  return <ImgCoin src={usdtAsset} alt="USDT" />
}


function IconUSDC() {
  return <ImgCoin src={usdcAsset} alt="USDC" />
}


function IconGRAM() {
  return <ImgCoin src={gramAsset} alt="Gram" />
}

function IconSOL() {
  return (
    <Wrap bg="#0b0b1a">
      <span className="inline-flex size-[70%] items-center justify-center">
        <SvgFull viewBox="0 0 397.7 311.7">
          <defs>
            <linearGradient id="sol-a" x1="360.9" y1="351.5" x2="141.2" y2="-69.3" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#00ffa3" /><stop offset="1" stopColor="#dc1fff" />
            </linearGradient>
            <linearGradient id="sol-b" x1="264.8" y1="401.6" x2="45.2" y2="-19.1" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#00ffa3" /><stop offset="1" stopColor="#dc1fff" />
            </linearGradient>
            <linearGradient id="sol-c" x1="312.5" y1="376.7" x2="92.9" y2="-44.0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#00ffa3" /><stop offset="1" stopColor="#dc1fff" />
            </linearGradient>
          </defs>
          <path fill="url(#sol-a)" d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1z" />
          <path fill="url(#sol-b)" d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1z" />
          <path fill="url(#sol-c)" d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1z" />
        </SvgFull>
      </span>
    </Wrap>
  )
}

function IconTRX() {
  return (
    <Wrap bg="#EB0029">
      <span className="inline-flex size-[72%] items-center justify-center">
        <SvgFull viewBox="0 0 64 64">
          <path
            fill="#fff"
            d="M50.5 20.4L14 13.5l19.4 37 20.3-27.3-1.5-.9-1.7-1.9zm-2.6 2.2l-9.6 8.6-13.2-11.4 22.8 2.8zm-16.3 8.3l-11-9.4L34.4 46l-2.8-15.1zM17 15.9l16.9 3.2 12.5 10.9L34.6 42l-17.6-26z"
          />
        </SvgFull>
      </span>
    </Wrap>
  )
}

function IconBNB() {
  return (
    <Wrap bg="#F3BA2F">
      <SvgFull viewBox="0 0 32 32">
        <path
          fill="#fff"
          d="M12 14.5L16 10.5l4 4 2.3-2.3L16 5.9 9.7 12.2 12 14.5zM6 16l2.3-2.3L10.6 16l-2.3 2.3L6 16zm6 1.5l4 4 4-4 2.3 2.3L16 26.1l-6.3-6.3L12 17.5zm9.4-1.5l2.3-2.3L26 16l-2.3 2.3L21.4 16zM18.3 16l-2.3-2.3L13.7 16l2.3 2.3L18.3 16z"
        />
      </SvgFull>
    </Wrap>
  )
}

function IconLTC() {
  return (
    <Wrap bg="#345D9D">
      <SvgFull viewBox="0 0 32 32">
        <path
          fill="#fff"
          d="M13 10.5l-1.5 6L9 17.3l-.5 2 2.5-.8-1 4h10.5l.9-3.4H14.7l1.2-4.8 2.7-.9.5-2-2.7.9L18 8h-4l-1 2.5z"
        />
      </SvgFull>
    </Wrap>
  )
}

function IconXRP() {
  return <ImgCoin src={xrpAsset} alt="XRP" />
}


function IconDOGE() {
  return <ImgCoin src={dogeAsset} alt="DOGE" />
}



function IconPOL() {
  return <ImgCoin src={polAsset} alt="POL" />
}

function IconXMR() {
  return (
    <Wrap bg="#FF6600">
      <SvgFull viewBox="0 0 32 32">
        <path fill="#fff" d="M16 5.5c-5.8 0-10.5 4.7-10.5 10.5 0 1.2.2 2.4.6 3.5H9V12l7 7 7-7v7.5h2.9c.4-1.1.6-2.3.6-3.5C26.5 10.2 21.8 5.5 16 5.5z" />
        <path fill="#4C4C4C" d="M11 21v2.5H6.9c1.5 1.9 3.7 3.2 6.2 3.7V18l2.9 2.9 2.9-2.9v9.2c2.5-.5 4.7-1.8 6.2-3.7H21V21l-5 5z" />
      </SvgFull>
    </Wrap>
  )
}



function IconDAI() {
  return (
    <Wrap bg="#F5AC37">
      <SvgFull viewBox="0 0 32 32">
        <path fill="#fff" d="M9.3 9h7.3c4 0 6.9 2.1 8 5.2h1.9v1.7h-1.5c0 .4.1.7.1 1.1 0 .4 0 .8-.1 1.1h1.5v1.7h-1.9c-1.1 3.1-4 5.2-8 5.2H9.3V19H7v-1.7h2.3v-2.2H7v-1.7h2.3V9zm2.2 2v3.4h5.4c2.2 0 3.9-.8 4.7-2.4-.7-.6-1.6-1-2.7-1h-7.4zm10.9 5.1H11.5v2.2h10.9c.1-.4.1-.7.1-1.1 0-.4-.1-.7-.1-1.1zm-1.8 3.9h-9.1v3.4h7.4c2.1 0 3.7-.9 4.6-2.4-.7-.6-1.6-1-2.9-1z" />
      </SvgFull>
    </Wrap>
  )
}

function IconBASE() {
  return (
    <Wrap bg="#0052FF">
      <SvgFull viewBox="0 0 32 32">
        <path fill="#fff" d="M15.9 26c5.5 0 10-4.5 10-10s-4.5-10-10-10c-5.2 0-9.5 4-9.96 9.1H19v1.8H5.94C6.4 22 10.7 26 15.9 26z" />
      </SvgFull>
    </Wrap>
  )
}

const ICONS: Record<string, () => ReactElement> = {
  BTC: IconBTC,
  ETH: IconETH,
  USDT: IconUSDT,
  USDC: IconUSDC,
  GRAM: IconGRAM,
  TON: IconGRAM,
  SOL: IconSOL,
  TRX: IconTRX,
  BNB: IconBNB,
  LTC: IconLTC,
  XRP: IconXRP,
  DOGE: IconDOGE,
  POL: IconPOL,
  MATIC: IconPOL,

  XMR: IconXMR,
  DAI: IconDAI,
  BASE: IconBASE,
}

const COLOR: Record<string, string> = {
  USDT: '#26A17B', USDC: '#2775CA', BTC: '#F7931A', ETH: '#627EEA',
  SOL: '#9945FF', GRAM: '#3AA0F0', TON: '#3AA0F0', TRX: '#EB0029', BNB: '#F3BA2F',
  LTC: '#345D9D', XRP: '#0F1720', DOGE: '#C2A633', POL: '#7B3FE4', MATIC: '#7B3FE4',
  XMR: '#FF6600', DAI: '#F5AC37', BASE: '#0052FF',
}

const GLYPH: Record<string, string> = {
  USDT: '₮', USDC: '$', BTC: '₿', ETH: 'Ξ',
  SOL: '◎', GRAM: '✦', TON: '✦', TRX: 'T', BNB: 'B',
  LTC: 'Ł', XRP: 'X', DOGE: 'Ð', POL: 'P', MATIC: 'P',

  XMR: 'ɱ', DAI: '◈', BASE: 'B',
}

// --- inner ----------------------------------------------------------------

function LogoInner({ symbol, src }: { symbol: string; src?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={symbol}
        loading="lazy"
        className="size-full rounded-full object-cover"
      />
    )
  }
  const Icon = ICONS[symbol]
  if (Icon) return <Icon />

  const bg = COLOR[symbol] ?? '#2A2A2A'
  const glyph = GLYPH[symbol] ?? symbol.slice(0, 1)
  return (
    <span
      style={{ background: bg }}
      className="inline-flex size-full items-center justify-center rounded-full text-[52%] font-bold text-white"
    >
      {glyph}
    </span>
  )
}

// --- badge (network) — mini real coin, ringed --------------------------

function NetworkBadge({ symbol }: { symbol: string }) {
  const Icon = ICONS[symbol]
  return (
    <span
      className="absolute -bottom-[6%] -right-[6%] inline-flex size-[46%] items-center justify-center overflow-hidden rounded-full ring-[1.5px] ring-background"
    >
      {Icon ? (
        <Icon />
      ) : (
        <span
          style={{ background: COLOR[symbol] ?? '#333' }}
          className="inline-flex size-full items-center justify-center rounded-full text-[52%] font-bold text-white"
        >
          {symbol.slice(0, 1)}
        </span>
      )}
    </span>
  )
}

// --- public API -----------------------------------------------------------

export interface CryptoLogoProps {
  symbol?: string
  network?: string
  /** Optional explicit pixel size. If omitted, the icon fills its parent (use a `size-*` Tailwind class). */
  size?: number
  showBadge?: boolean
  src?: string
  className?: string
}

export function CryptoLogo({
  symbol,
  network,
  size,
  showBadge,
  src,
  className,
}: CryptoLogoProps) {
  const coin = normalize(symbol) ?? normalize(network) ?? 'BTC'
  const net = normalize(network)
  const autoBadge = !!net && net !== coin
  const displayBadge = showBadge ?? autoBadge

  const style: CSSProperties | undefined =
    size != null ? { width: size, height: size } : undefined

  return (
    <span
      className={`relative inline-flex shrink-0 ${className ?? ''}`}
      style={style}
    >
      <LogoInner symbol={coin} src={src} />
      {displayBadge && net && <NetworkBadge symbol={net} />}
    </span>
  )
}

export function CoinIcon(props: CryptoLogoProps) {
  return <CryptoLogo {...props} />
}
