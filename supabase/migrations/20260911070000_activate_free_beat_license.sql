-- Activates the Free beat license tier, which has been scaffolded in draft
-- since it was first added (see 20260910130000_add_free_beat_license_tier.sql)
-- but never approved for real use — its terms_text was still the
-- placeholder "DRAFT — NOT APPROVED FOR SALE" stub, so the activation
-- check constraint deliberately excluded 'free' from ever going active,
-- the same way 'exclusive' stays out of scope entirely.
--
-- Mirrors 20260729010000_m18_nonexclusive_beat_store_activation.sql's own
-- activation pattern exactly: real terms text (here, the already-approved
-- Basic License's non-exclusive grant/limits language, adapted for a $0
-- claim instead of a payment), status flipped to active, approved_by set.

alter table public.beat_license_templates
  drop constraint if exists beat_license_template_activation_check;
alter table public.beat_license_templates
  add constraint beat_license_template_activation_check check(
    status <> 'active'
    or (
      platform_approved_at is not null
      and approved_by is not null
      and char_length(terms_text) >= 500
      and not is_exclusive
      and tier_code in ('basic','premium','trackout','free')
    )
  );

update public.beat_license_templates
set
  status = 'active',
  platform_approved_at = now(),
  approved_by = '26a43db5-2c83-4980-a7e7-21764f899505',
  updated_at = now(),
  terms_text = $license$44OS STANDARD NON-EXCLUSIVE BEAT LICENSE — FREE (VERSION 1)

LICENSE RECORD. This license is an agreement between the creator identified as the seller in the 44OS license record (“Licensor”) and the recipient identified in that record (“Licensee”). The licensed Beat, date, license number, and terms digest are the values stored with that record. This license is provided at no cost and becomes effective once 44OS records the claim. 44OS provides the marketplace, record, and file delivery service; 44OS is not the Licensor, does not acquire ownership of the Beat, and is not responsible for enforcing either party’s rights.

GRANT. Licensor grants Licensee a non-exclusive, worldwide, perpetual license to use the Beat to create one new original song or instrumental work (“New Song”). Licensee may write, record, edit, arrange, mix, and master the New Song; distribute and monetize audio recordings of it without a copy, download, stream, or performance cap; perform it publicly; broadcast it; and use it in promotional social posts, lyric videos, visualizers, and music videos whose primary purpose is promoting the New Song. This license includes an untagged MP3 delivery file. No ownership in the Beat or its underlying composition is transferred.

LIMITS. Licensee may not sell, share, upload, distribute, or sublicense the Beat or any delivered file by itself; make the Beat or stems available as a sample, loop, stock-music asset, template, or production library; falsely claim authorship or exclusive ownership of the Beat; register the Beat itself with a copyright office; or place the Beat, the delivered files, or the New Song into YouTube Content ID, Meta Rights Manager, Audible Magic, or another automated rights-claiming system without Licensor’s separate written consent. Film, television, advertising, game, app, podcast-theme, theatrical, and other third-party synchronization uses require a separate written license from Licensor. Licensee may not transfer this license except with Licensor’s written agreement.

OWNERSHIP, CREDIT, AND SAMPLES. Licensor keeps all ownership in the Beat and may continue licensing it to other people. Licensee owns Licensee’s original lyrics, vocals, and other original additions, subject to Licensor’s rights in the Beat. Existing non-exclusive licenses survive later sales or changes in availability. Where credits are reasonably provided, Licensee will credit the producer using the seller name in the license record, for example “Produced by [Licensor].” Licensor is responsible for accurately disclosing known third-party samples or loops in the Beat listing and represents that Licensor controls the rights needed to offer this license. Licensee remains responsible for material Licensee adds to the New Song and for any use outside this license.

BREACH AND RECORDS. A material breach not cured within fourteen days after written notice from Licensor may terminate this license. Uses made while the license was active remain subject to applicable law, and unauthorized uses are not authorized by this license. The immutable 44OS license record, terms digest, seller snapshot, and file manifest are evidence of the license delivered at the time of claim. Any claim or enforcement decision is between Licensor and Licensee under applicable law. Neither party is promised a particular commercial result, and neither party may represent that 44OS endorsed the Beat, the New Song, or a legal claim.$license$
where tier_code = 'free' and status = 'draft';

-- Bring every existing beat's already-created (but still draft/unapproved)
-- Free License offer online now that the template behind it is active —
-- a creator who already picked "Free License" for a beat shouldn't need to
-- re-pick it once the tier itself is approved.
update public.catalog_offers co
set status = 'active', updated_at = now()
from public.beat_license_offers blo
join public.beat_license_templates blt on blt.id = blo.template_id
where co.id = blo.offer_id
  and blt.tier_code = 'free'
  and blt.status = 'active'
  and co.status = 'draft';
