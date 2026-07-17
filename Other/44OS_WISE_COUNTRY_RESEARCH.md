# 44OS Wise country and recipient research

Status: research evidence only; not a production eligibility allowlist  
Checked: 2026-07-17  
Business/operator: forty four  
Platform: 44OS  
Payout sender: forty four's U.S. Wise Business account  
Launch recipient type: natural person receiving creator earnings

## Decision this file supports

Wise country support is not one universal list. Four different questions must
remain separate:

1. Can a resident register or sign in to Wise?
2. Can that resident hold money in a Wise account?
3. Can forty four's Wise Business account send to that person's external bank
   account in a particular country and currency?
4. Is the exact business-to-individual route available at the time of payout,
   for that recipient bank and the information Wise currently requires?

A country must not become creator-eligible merely because it is absent from
Wise's unsupported-country list. Creator eligibility requires a reviewed,
currently supported business-to-individual bank route. Wise can change routes,
fees, banks, requirements, and account features.

Requiring every creator to hold money in a Wise account is not viable for the
intended market. Namibia and Laos are not on Wise's current balance-holding
residency list, even though Wise currently advertises direct delivery to local
bank accounts in Namibia and Laos without a recipient Wise account.

## Recommended launch boundary

- Collect country during member registration.
- Store country as an ISO 3166-1 alpha-2 code on the private account/profile
  record and show the country name in ordinary settings.
- A country selection is preliminary information, not proof of residence,
  citizenship, tax residence, bank location, or payout eligibility.
- Promotion from Member to Creator is allowed only when an active,
  operator-reviewed payout route exists for the member's country and intended
  bank-account currency.
- Launch only with Wise's email-to-claim flow when the exact route offers it because Wise,
  rather than 44OS, collects the bank details. Email-to-claim does not require
  the recipient to have a Wise account.
- When email-to-claim is unavailable, waitlist the country/creator. Direct-bank
  collection requires a later one-to-one reviewed migration; it is not a
  launch fallback and bank details must never be collected through support.
- Re-check the route in Wise Business before approving the first payout and
  periodically thereafter. A static country list is insufficient evidence that
  a particular bank remains payable.
- A country without an approved route is `payout_route_waitlisted`, not
  permanently rejected. It may be enabled later after Wise or another reviewed
  provider becomes available.

## Important examples

| Residence/bank country | May hold a Wise balance | Direct external-bank evidence | Launch conclusion |
| --- | --- | --- | --- |
| Namibia | No, not on Wise's current list | Wise advertises U.S. USD to local NAD bank delivery without a recipient Wise account; USD SWIFT to a USD-denominated Namibian bank account is also listed | Do not require a Wise account. Candidate for an approved NAD route after owner verifies the exact Wise Business recipient fields and business route. |
| Laos | No, not on Wise's current list | Wise advertises U.S. USD to local LAK bank delivery without a recipient Wise account and lists USD SWIFT to Laos | Do not require a Wise account. Candidate for an approved LAK route after owner verifies the exact Wise Business recipient fields and confirms the bank accepts LAK. |
| Zimbabwe | No, not on Wise's current list | Zimbabwe is not in Wise's current USD SWIFT destination list, and no current U.S.-to-Zimbabwe local route was verified | Waitlist at launch unless the owner obtains route-specific confirmation from Wise for the creator's bank/currency. |

Being able to register for Wise is not equivalent to being able to hold or
receive money in Wise. Wise says registration is available from "most"
countries, but it does not publish a positive, exhaustive registration list.
Its explicit unsupported list and balance-holding list are recorded below.

## Wise locations where service is unavailable

Wise states that people in these locations cannot register, log in, send, or
receive:

- Afghanistan
- Belarus
- Burundi
- Central African Republic
- Chad
- Congo
- Democratic Republic of the Congo
- Cuba
- Eritrea
- Iran
- Iraq
- North Korea
- Libya
- Myanmar
- Somalia
- Republic of South Sudan
- Russia
- Sudan
- Syria
- Yemen
- Venezuela
- Ukraine regions Crimea, Donetsk, Luhansk, Kherson, and Zaporizhzhia

Source: [Wise — Where can I use Wise?](https://wise.com/help/articles/2978049/where-can-i-use-wise)

Absence from this list does not prove that a person can hold a balance, obtain
receiving details, use email discovery, or receive a particular transfer.

## Residences where Wise currently permits holding money

Wise's current positive list is:

- Andorra
- Argentina
- Australia
- Austria
- Bahrain
- Belgium
- Bouvet Island
- Brazil
- Bulgaria
- Canada
- Cayman Islands
- Chile
- China
- Colombia
- Costa Rica
- Croatia
- Cyprus
- Czechia
- Denmark
- Estonia
- Finland
- France
- French Guiana
- Georgia
- Germany
- Gibraltar
- Greece
- Guadeloupe
- Guam
- Guernsey
- Hong Kong
- Hungary
- Iceland
- Ireland
- Israel
- Isle of Man
- Italy
- Japan
- Jersey
- Kuwait
- Latvia
- Liechtenstein
- Lithuania
- Luxembourg
- Macao
- Malaysia
- Malta
- Martinique
- Mayotte
- Monaco
- Netherlands
- New Zealand
- North Macedonia
- Norway
- Peru
- Philippines
- Poland
- Portugal
- Qatar
- Réunion
- Romania
- Saint Barthélemy
- Saint Martin
- Saint Pierre and Miquelon
- Saudi Arabia
- Singapore
- Sint Maarten
- Slovakia
- Slovenia
- South Africa
- South Korea
- Spain
- Sweden
- Switzerland
- Taiwan
- Thailand
- United Kingdom
- United States
- Uruguay

Current restrictions include:

- Bahrain, Israel, and Malaysia: personal balance holding only, not business.
- Hong Kong: business balance holding only, not personal.
- Brazil: BRL holding depends on Brazilian residence.
- Thailand: Wise says it has temporarily stopped issuing currencies and account
  details to customers there.
- United States: Nevada residents cannot hold money.
- Wise warns that new and older accounts may have different features.

Source: [Wise — Where do I need to live to hold money with Wise?](https://wise.com/help/articles/2813542/where-do-i-need-to-live-to-hold-money-with-wise)

Namibia, Laos, and Zimbabwe do not appear in this list.

## Wise's named send-to destinations

Wise's general destination page currently names:

- Argentina
- Australia
- Bangladesh
- Brazil
- Bulgaria
- Canada
- Chile
- China
- Colombia
- Costa Rica
- Czech Republic
- Denmark
- Egypt
- Europe
- Georgia
- Ghana
- Hong Kong
- Hungary
- India
- Indonesia
- Kenya
- Malaysia
- Mexico
- Morocco
- Nepal
- New Zealand
- Nigeria
- Norway
- Pakistan
- Philippines
- Poland
- Romania
- Singapore
- South Africa
- South Korea
- Sri Lanka
- Sweden
- Switzerland and Liechtenstein
- Tanzania
- Thailand
- Turkey
- Uganda
- Ukraine
- United Arab Emirates
- United Kingdom
- United States of America
- Uruguay
- Vietnam
- Zambia

Wise says an unlisted destination may still be reachable when the recipient
account is denominated in USD, EUR, or GBP. The list therefore is not a complete
country allowlist.

Source: [Wise — What countries/regions can I send to?](https://wise.com/help/articles/2571942/what-countriesregions-can-i-send-to)

## Countries and territories Wise currently lists for USD SWIFT

This route is relevant when a creator's external bank account is outside the
United States but denominated in USD. It can take up to six working days,
intermediary-bank charges can apply, and Wise validates the SWIFT code during
recipient setup.

- Aland Islands
- Albania
- Algeria
- American Samoa
- Andorra
- Angola
- Anguilla
- Antigua and Barbuda
- Argentina
- Armenia
- Aruba
- Australia
- Austria
- Azerbaijan
- Bahamas
- Bahrain
- Bangladesh
- Barbados
- Belgium
- Benin
- Bermuda
- Bhutan
- Bolivia
- Bosnia and Herzegovina
- Botswana
- Brazil
- Brunei Darussalam
- Bulgaria
- Burkina Faso
- Cabo Verde
- Canada
- Cambodia
- Cayman Islands
- Chile
- China
- Christmas Island
- Cocos (Keeling) Islands
- Colombia
- Cook Islands
- Costa Rica
- Côte d'Ivoire
- Croatia
- Cyprus
- Czechia
- Denmark
- Dominica
- Dominican Republic
- Ecuador
- Egypt
- El Salvador
- Estonia
- Ethiopia
- Falkland Islands (Malvinas)
- Faroe Islands
- Fiji
- Finland
- France
- French Guiana
- French Polynesia
- Gabon
- Gambia
- Georgia
- Germany
- Ghana
- Gibraltar
- Greece
- Greenland
- Grenada
- Guadeloupe
- Guatemala
- Guernsey
- Guinea
- Guinea-Bissau
- Guyana
- Haiti
- Heard Island and McDonald Islands
- Holy See
- Honduras
- Hong Kong
- Hungary
- Iceland
- India
- Indonesia
- Ireland
- Isle of Man
- Israel
- Italy
- Jamaica
- Japan
- Jersey
- Kazakhstan
- Kenya
- Kiribati
- Kosovo
- Kuwait
- Kyrgyzstan
- Laos
- Latvia
- Lebanon
- Lesotho
- Liberia
- Liechtenstein
- Lithuania
- Luxembourg
- Macao
- Malawi
- Malaysia
- Maldives
- Mali
- Malta
- Marshall Islands
- Martinique
- Mauritania
- Mauritius
- Mayotte
- Mexico
- Micronesia
- Moldova
- Monaco
- Mongolia
- Montenegro
- Montserrat
- Morocco
- Mozambique
- Namibia
- Nauru
- Nepal
- Netherlands
- Netherlands Antilles
- New Caledonia
- New Zealand
- Nicaragua
- Niger
- Nigeria
- Niue
- Norfolk Island
- North Macedonia
- Northern Mariana Islands
- Norway
- Oman
- Pakistan
- Palau
- Panama
- Papua New Guinea
- Paraguay
- Peru
- Philippines
- Poland
- Portugal
- Qatar
- Reunion
- Romania
- Rwanda
- Saint Helena, Ascension and Tristan da Cunha
- Saint Kitts and Nevis
- Saint Lucia
- Saint Pierre and Miquelon
- Saint Vincent and the Grenadines
- Samoa
- San Marino
- São Tomé and Principe
- Saudi Arabia
- Senegal
- Serbia
- Seychelles
- Sierra Leone
- Singapore
- Slovakia
- Slovenia
- Solomon Islands
- South Africa
- South Korea
- Spain
- Sri Lanka
- Suriname
- Svalbard and Jan Mayen
- Sweden
- Switzerland
- Taiwan
- Tajikistan
- Tanzania
- Thailand
- Timor Leste
- Tonga
- Trinidad and Tobago
- Tunisia
- Turkey
- Turks and Caicos Islands
- Tuvalu
- Uganda
- Ukraine
- United Arab Emirates
- United Kingdom
- Uruguay
- Uzbekistan
- Vanuatu
- Vietnam
- Wallis and Futuna
- Zambia

Source: [Wise — What countries and regions can I send USD to via Swift?](https://wise.com/help/articles/2974947/what-countries-and-regions-can-i-send-usd-to-via-swift)

This list does not by itself prove that forty four may make the transfer from a
business account, that every bank in the country is accepted, or that the bank
account belongs to an eligible individual. Those are route-level checks.

## Business-transfer restrictions that affect creator payouts

Wise separately warns that business transfers can be narrower than personal
transfers. Current examples include:

- BDT and TZS: both sending and recipient accounts must be individual accounts;
  this conflicts with forty four sending from Wise Business.
- COP, NPR, PKR, and UAH: recipient limitations apply; the individual-only
  recipient requirement may fit the 44OS launch model but still requires a
  route check.
- Wise lists additional limitations for BRL, CNY, IDR, INR, JPY, MYR, NZD,
  TRY, USD, and VND.

Source: [Wise — Are there any restrictions on business transfers?](https://wise.com/help/articles/2570950/are-there-any-restrictions-on-business-transfers)

## Email recipient findings

Wise documents two experiences that must not be confused:

1. An existing Wise user may be discoverable by email, phone, or Wisetag.
2. When the sender does not know the recipient's bank details, Wise may offer
   money-to-email. Wise emails the recipient a secure link and collects the
   bank details itself. Wise explicitly describes this for a recipient without
   a Wise account.

Email-to-claim is the only selected 44OS launch method, but Wise does not
promise it for every route. Wise's recipient documentation says route
availability must be checked for the transaction. A country without this route
is waitlisted; email-to-claim must not become the basis of a global promise.

Sources:

- [Wise — What if I don't know my recipient's bank details?](https://wise.com/help/articles/2448398/what-if-i-dont-know-my-recipient's-bank-details)
- [Wise — Send money to an email address](https://wise.com/us/send-money/send-money-to-email)
- [Wise — Adding recipients](https://wise.com/help/articles/2491526/how-do-i-add-or-delete-recipients)

## Namibia and Laos route evidence

- [Wise — Send money from the U.S. to Namibia](https://wise.com/us/send-money/send-money-to-namibia)
  currently states that USD can be converted and delivered as NAD to a local
  Namibian bank account and that the recipient does not need a Wise account.
- [Wise — Send money from the U.S. to Laos](https://wise.com/us/send-money/send-money-to-laos)
  currently states that USD can be converted and delivered as LAK to a local
  Lao bank account without a Wise account. It warns the recipient bank account
  must be able to receive LAK.

These marketing route pages are evidence that the routes are offered publicly,
not final evidence that forty four's verified Wise Business profile can pay a
particular bank. The owner must confirm the business route and exact recipient
fields in Wise before 44OS activates each route.

## Deferred security boundary if 44OS ever stores bank information

The final launch design stores no bank information. This section is retained
only as a gate for a future separately reviewed direct-bank fallback.

Ordinary Supabase encryption at rest and RLS are necessary but not sufficient
for this data. Supabase documents that service-role credentials bypass RLS.
Bank details therefore must not be plaintext in a table that the application
service role can casually read.

Minimum design boundary:

- separate private schema or otherwise non-exposed storage;
- authenticated encryption before data reaches the database;
- encryption key kept outside the database and separate from ordinary Supabase
  API credentials;
- per-record or envelope-encryption keys with rotation and versioning;
- authenticated server-only submission;
- no plaintext in logs, errors, analytics, email, support history, browser
  persistence, ordinary Admin queries, database views, backups, or replicas;
- masked facts and an immutable digest stored separately from ciphertext;
- short-lived, purpose-bound, reauthenticated operator decryption;
- immutable access audit for submission, viewing, replacement, and payout use;
- two-person or separately reviewed reconciliation when available;
- replacement creates a new version and never overwrites evidence;
- deletion/retention policy approved by legal and tax professionals;
- incident-response and key-rotation procedure tested before activation.

Supabase Vault uses authenticated encryption and keeps its key outside the
database, but its decrypted view must itself be tightly protected. A dedicated
external key-management/envelope-encryption design should be reviewed before
deciding whether Vault alone is appropriate for creator bank records.

Sources:

- [Supabase — Vault](https://supabase.com/docs/guides/database/vault)
- [Supabase — Row Level Security and service-role bypass](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Secure configuration](https://supabase.com/docs/guides/security/product-security)

## Required owner verification before a route becomes active

This is a read-only/pre-transfer check. Do not fund or submit a transfer.

1. Sign in to forty four's Wise Business account directly.
2. Start `Send money`, select `Someone else`, and select an individual
   recipient.
3. Choose the proposed recipient country and bank-account currency.
4. Confirm that Wise permits the transfer from the business profile.
5. Record only the field names Wise asks for, route currency, recipient type,
   displayed limits, and whether email-to-claim is offered. Do not place real
   creator bank data in notes, screenshots, source control, Sandbox, or chat.
6. Cancel before adding a real recipient, funding, or submitting the transfer.
7. Have the route record reviewed and dated before making it eligible in 44OS.

The runtime route registry must have an expiry/revalidation date. If it expires
or Wise rejects a bank, new creator activation for that route fails closed
until reviewed.
