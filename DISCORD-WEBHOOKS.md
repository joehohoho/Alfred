# DISCORD-WEBHOOKS.md — Discord Webhook Config

Source of truth: `/Users/hopenclaw/Documents/Discord URLs.txt`
**Never commit this file to a public repo.**

---

| Channel | Webhook URL | Purpose |
|---------|-------------|---------|
| #general | https://discord.com/api/webhooks/1476597492941328507/weEzAJtm2P_uNT1sagC8niVu8MrjNs0heI1vmhVk_TN9bLkr9Qn-7-qmSG_doa0RpB48 | General server channel |
| #alfred-and-hal | https://discord.com/api/webhooks/1476597635866427583/aa422QrNltuzZrxbwvGFvtCwsIWofH1C0sYkIPlR__1Tn_ZMrqnvVKiBufyBejOVefS3 | Alfred + HAL collaboration, overnight builds |
| #alerts | https://discord.com/api/webhooks/1476597796873310300/b4Kw6eqiCrbhYM2Lb6kAw3sKaC9O_ksgDd3UW84S6Lk2e6y_kWPHCZFokvMIgy5IOc_f | System alerts |
| #decision-notifications | https://discord.com/api/webhooks/1476597895724662876/_S1sCtrCjtE9xclAFY2lHSRHmsGXgVCdRefYV4Zi4HsgmPPgugSBCDd0OV7oEZwBM79Q | Alfred autonomous decision log |
| #general-research | https://discord.com/api/webhooks/1476598024670285937/gMdB-JIMiUzQHQjYCYkHVoWQ4kgrxgUS05IcMYT3LV76r2KpRJv-q9WC_gMw0rzauC1S | Research, deals, audits, recommendations, findings |
| #morning-routine | https://discord.com/api/webhooks/1476598143016505446/IA_l2Gj2MUxAHCX-t1AthFRnXiHwyQwVToTY-NiYZkIJtLPAmpWGyFs7qqIXI7RlN_Yr | Morning routine updates |
| #weekly-wins-and-impact | https://discord.com/api/webhooks/1476598258083168256/MjeM9c5tDtyx47zxYLdORi4Y4TYxqM1h0RyLcKSKLqaTqlsro6Mi0d5nQnP_S3eOaTK_ | Weekly wins & impact digest |
| #hal-completed-tasks | https://discord.com/api/webhooks/1476598374982750232/5GVgm1Yx_I-4xc6V2Dt1rErFI_c3dApQXc9cHLydoB4c193yzHH5aquvKnQw_QOMSavV | HAL completed task notifications |
| #moltbook-review | https://discord.com/api/webhooks/1476598485653524650/uRc8F2V9AlM78BCSRK9fvqericDLLFKcN5qcx_5QDQOzvFP0Qbq7UqfhBVnRjEjdP2Qv | Moltbook research & agent insights |
| #cuu-code-review | https://discord.com/api/webhooks/1476598626053521558/f3lpO2djy4VxvyiC7yiD3Mq-y_fXzQOwVplH4X8VehwmbLo-WFOYPFdOSOn7x1jArvnK | CoinUsUp code review results |
| #cuu-app-audit | https://discord.com/api/webhooks/1476598736967962655/LL5hS9y_CRwjAzUIiRBuKfEe2FlhBcygNoH_P78IjPzvloT78ywVyfBDK-L0Y9eSz2Bw | CoinUsUp app audits |
| #cuu-revenue-growth | https://discord.com/api/webhooks/1476598831801176187/qYzrq4gIVStbRiTL7_NYfyfxZP1GFmSUOu8M2cTtnR0exaKItHZVPMelho89xMhgzN42 | CoinUsUp revenue growth |
| #msl-code-review | https://discord.com/api/webhooks/1476599067030327377/4Chs2Er_l-EQES93JPSHXv_HBOX8ZS2yEMJmZkMwVrdcMZwubQuewALFOl8V8jUufNUO | Market Signal Lab code review |
| #msl-code-fixes | https://discord.com/api/webhooks/1476599175146635294/G85A_LpNbt-XLRfQWR7oZ2l3w6fPtQiB7-NxNGvrS8QdH7tmE1i6UR4zAFsv6Gf3CPh- | Market Signal Lab code fixes |
| #msl-general | https://discord.com/api/webhooks/1476599329736102132/ZPxQ-4QNPZSZB2h5Zi67nJ1AI795irRA6ZlI78LCgzL7ASfCnFJjdLtVvg0EGMgk4kQ9 | Market Signal Lab general |
| #infrastructure-health-check | https://discord.com/api/webhooks/1476601769495892170/e9-XC8E0iys21STr9lVmQrX8UjaNapdFY8L854aK7QDx_tCsL5-9wN3yfwflOlqTVkD8 | Infrastructure health checks |

---

## Routing Rules

- **Research, deals, findings, recommendations** → #general-research
- **Infrastructure health checks** → #infrastructure-health-check
- **Alfred autonomous decisions** → #decision-notifications
- **HAL completed tasks** → #hal-completed-tasks
- **CoinUsUp code review** → #cuu-code-review
- **CoinUsUp audits** → #cuu-app-audit
- **CoinUsUp revenue** → #cuu-revenue-growth
- **MSL code review** → #msl-code-review
- **MSL code fixes** → #msl-code-fixes
- **MSL general** → #msl-general
- **Alfred + HAL builds/collab** → #alfred-and-hal
- **Weekly digest** → #weekly-wins-and-impact
- **Morning routine** → #morning-routine
- **System alerts** → #alerts

## Rule: Never text Joe these — post to Discord instead.
