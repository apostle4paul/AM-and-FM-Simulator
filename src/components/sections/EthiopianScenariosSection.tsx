import React from 'react';
import { SectionHeader } from '../common/ControlPrimitives';

export const EthiopianScenariosSection: React.FC = () => {
  const scenarioMatrix = [
    {
      factor: 'Terrain & Topography',
      rural:
        'Ethiopia features rugged highlands (Simien, Bale, central plateau > 2,000–4,000 m), deep river gorges (Blue Nile / Abay), and vast lowland basins (Afar, Somali). Ground-wave MW AM diffracts around terrain contours better than VHF line-of-sight, though mountainous rocky soil reduces ground conductivity. VHF FM suffers severe terrain shadowing without elevated ridge repeaters.',
      urban:
        'High building density and concrete/steel structures in Addis Ababa, Adama, Hawassa, and Dire Dawa create strong VHF multipath reflections and shadow pockets. However, elevated urban ridges (e.g., Entoto overlooking Addis Ababa) provide commanding line-of-sight coverage for FM.',
    },
    {
      factor: 'Coverage Reach',
      rural:
        'A single high-power MW AM transmitter (within the ITU Region 1 526.5–1606.5 kHz band) can provide tens to hundreds of kilometers of daytime ground-wave coverage and long-distance nighttime sky-wave propagation via the ionosphere—though sky-wave also introduces self-fading and co-channel interference.',
      urban:
        'Local VHF FM (87.5–108 MHz) typically covers 15–50 km radius from an elevated mast, making it well suited for metropolitan districts and localized community broadcasting with controlled adjacent-channel spacing.',
    },
    {
      factor: 'Noise & Interference',
      rural:
        'Rural areas have low man-made industrial EMI, but tropical atmospheric static (lightning discharges during the Kiremt rainy season, June–September) strongly degrades AM amplitude envelopes. FM limiter/discriminator stages suppress amplitude-borne static above threshold.',
      urban:
        'Cities exhibit intense impulsive electrical noise from vehicles, switching power supplies, neon signage, and high-voltage distribution lines. Because AM encodes information in amplitude, urban EMI directly enters AM audio; FM’s constant envelope + limiter gives superior noise immunity.',
    },
    {
      factor: 'Receiver Availability & Cost',
      rural:
        'Low-cost multi-band (MW/SW/FM) battery and solar hand-crank radios remain common in off-grid rural households; basic AM/FM receivers require minimal battery power. Feature phones increasingly include FM tuners (using wired earphones as antennas) where mobile coverage exists, though many lack MW AM reception.',
      urban:
        'Near-universal VHF FM receiver penetration via smartphones, car stereos, home audio systems, and low-cost portable radios makes FM the dominant urban consumer broadcast interface.',
    },
    {
      factor: 'Infrastructure & Power Constraints',
      rural:
        'MW AM requires tall quarter-wave/half-wave radiator masts (tens of meters high), extensive buried copper ground radials, and high continuous RF power (often 10–100+ kW) backed by diesel generators where grid electricity is intermittent. FM uses compact mast-mounted dipole/Yagi bays with higher transmitter wall-plug efficiency.',
      urban:
        'Existing telecom/broadcast towers, three-phase grid utility power, and fiber/microwave studio-to-transmitter links (STL) simplify FM installation and routine preventive maintenance in Ethiopian cities.',
    },
    {
      factor: 'AM Suitability',
      rural:
        'High suitability for regional/national wide-area public information, agricultural advisories, distance education, and emergency alerts across dispersed settlements—provided lightning protection and power backup are engineered.',
      urban:
        'Low to moderate suitability. High urban electrical EMI, poorer audio bandwidth (~4.5–5 kHz audio), and fewer smartphone MW tuners limit urban competitiveness relative to FM.',
    },
    {
      factor: 'FM Suitability',
      rural:
        'Moderate suitability when deployed as a network of solar-assisted low/medium-power hilltop relays serving clustered rural woredas; less cost-effective for ultra-sparse nomadic lowlands where a single mast cannot achieve line-of-sight.',
      urban:
        'Very high suitability. Delivers superior audio fidelity (up to 15 kHz mono/stereo), strong urban EMI rejection, compact antenna footprint, and efficient VHF frequency reuse across cities.',
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Ethiopian Broadcasting Scenarios"
        subtitle="Comparative engineering evaluation of Medium-Wave AM and VHF FM across wide-area rural and dense urban Ethiopian deployment environments."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Scenario 1 */}
        <div className="bg-[#0D131F] border border-slate-800 rounded-md p-5 space-y-3">
          <div className="text-xs font-mono text-blue-400">Scenario 1 · Regional & Dispersed Coverage</div>
          <h2 className="text-lg font-semibold text-slate-100">
            Wide-Area and Rural Broadcasting in Ethiopia
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Regional broadcasters serving dispersed agricultural and pastoralist woredas across Oromia,
            Amhara, Tigray, SNNP/South Ethiopia, Somali, and Afar regions require resilient public
            information, distance education, and emergency radio services where grid power and terrestrial
            internet are uneven.
          </p>
          <ul className="space-y-2 text-xs text-slate-400 list-disc pl-4 leading-relaxed">
            <li>
              <strong className="text-slate-200">Propagation Physics (ITU Region 1 MW):</strong> Medium-wave AM (international Region 1 allocation <span className="font-mono text-slate-300">526.5–1606.5 kHz</span>, distinct from specific national station authorizations)
              propagates via surface ground waves that diffract into valleys and over moderate hills, plus
              ionospheric sky waves at night—extending reach across wide rural basins. However, highland/mountainous
              rocky terrain increases ground-wave attenuation, and nighttime sky-wave fading can cause
              selective distortion.
            </li>
            <li>
              <strong className="text-slate-200">Remote Community Accessibility &amp; Power/Towers:</strong> Where dispersed settlements lack reliable grid power or local VHF line-of-sight relays, tall quarter-wave MW masts with buried radial grounds and backup diesel generators remain technically and economically defensible for reaching off-grid battery/solar AM receivers, whereas FM alone requires multiple hilltop gap-fillers and STL backhaul.
            </li>
            <li>
              <strong className="text-slate-200">Balanced Nuance:</strong> AM does not automatically reach
              every shadowed mountain gorge (especially during severe Kiremt lightning noise), nor is FM
              incapable of serving rural towns—regional FM relays on elevated plateaus effectively serve
              high-density rural corridors.
            </li>
          </ul>
          <div className="bg-[#080D16] border border-slate-800 rounded p-3 text-xs">
            <span className="font-semibold text-blue-300">Engineering Recommendation (Scenario 1): </span>
            <span className="text-slate-300">
              Deploy high-reliability Medium-Wave AM (or hybrid MW AM backbone + targeted solar-powered
              rural FM repeaters) for wide-area emergency, agricultural, and regional public-service coverage
              where dispersed populations exceed line-of-sight reach.
            </span>
          </div>
        </div>

        {/* Scenario 2 */}
        <div className="bg-[#0D131F] border border-slate-800 rounded-md p-5 space-y-3">
          <div className="text-xs font-mono text-cyan-400">Scenario 2 · Metropolitan & Community Radio</div>
          <h2 className="text-lg font-semibold text-slate-100">
            Urban and Community Radio (Addis Ababa & Regional Cities)
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Urban public information, university/educational stations, municipal traffic/emergency
            bulletins, and community radio stations operating in Addis Ababa, Adama, Bahir Dar, Mekelle,
            Hawassa, and Dire Dawa prioritize voice clarity, music fidelity, and immunity to electrical
            noise.
          </p>
          <ul className="space-y-2 text-xs text-slate-400 list-disc pl-4 leading-relaxed">
            <li>
              <strong className="text-slate-200">Audio Fidelity & Noise Immunity:</strong> VHF FM supports
              wide deviation (±75 kHz broadcast standard) and pre-emphasis/de-emphasis, delivering
              high-SNR audio above the FM threshold while rejecting impulsive EMI from transformers,
              motorbikes, and industrial equipment.
            </li>
            <li>
              <strong className="text-slate-200">Multipath, Shadowing &amp; Adjacent-Channel Planning:</strong> Reinforced-concrete
              buildings and terrain hills cause multipath reflections and shadow pockets. FM receivers benefit from the FM capture effect
              (locking onto the stronger direct signal) and compact antenna siting on existing city rooftops
              or elevated hills such as Entoto, provided channel spacing and filter selectivity control adjacent-channel interference.
            </li>
            <li>
              <strong className="text-slate-200">Regulatory Coordination &amp; Receivers:</strong> Spectrum management, frequency allocation, and radiocommunication assignment are regulated by the <strong className="text-slate-200">Ethiopian Communications Authority (ECA)</strong>, while broadcasting service licensing and media oversight fall under the <strong className="text-slate-200">Ethiopian Media Authority (EMA)</strong>. Where suitable VHF frequencies, urban three-phase electricity, and community radio infrastructure are available, widespread FM tuners in phones, cars, and affordable portable radios favor FM.
            </li>
          </ul>
          <div className="bg-[#080D16] border border-slate-800 rounded p-3 text-xs">
            <span className="font-semibold text-cyan-300">Engineering Recommendation (Scenario 2): </span>
            <span className="text-slate-300">
              Select VHF FM for urban, educational, and local community broadcasting where higher audio
              quality, compact urban tower footprints, impulsive EMI immunity, and consumer FM tuner
              adoption maximize reach and clarity.
            </span>
          </div>
        </div>
      </div>

      {/* Scenario Comparison Table */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4">
        <h2 className="text-base font-semibold text-slate-100 mb-3">
          Rural / Wide-Area vs Urban / Community Comparative Matrix
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left leading-relaxed">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 pr-4 w-44 font-medium">Evaluation Factor</th>
                <th className="py-2.5 pr-4 font-medium text-blue-300">Rural / Wide-Area Ethiopia</th>
                <th className="py-2.5 font-medium text-cyan-300">Urban / Community Ethiopia</th>
              </tr>
            </thead>
            <tbody>
              {scenarioMatrix.map((row) => (
                <tr key={row.factor} className="border-b border-slate-800/70 align-top">
                  <td className="py-3 pr-4 font-medium text-slate-200">{row.factor}</td>
                  <td className="py-3 pr-4 text-slate-300">{row.rural}</td>
                  <td className="py-3 text-slate-300">{row.urban}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Implementation, Installation, Receiver & Maintenance Complexity Matrix (1–5 Scale) */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Implementation, Installation, Receiver &amp; Maintenance Complexity (1–5 Qualitative Scale)
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Illustrative qualitative complexity scale: 1 = Very low complexity, 2 = Low, 3 = Moderate, 4 = High, 5 = Very high complexity. (Note: In Section 9&apos;s Weighted Decision Matrix, scores are oriented so higher = more favorable, whereas here 1–5 measures engineering complexity.)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left leading-relaxed">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 pr-4 w-44 font-medium">Complexity Dimension</th>
                <th className="py-2.5 pr-4 w-32 font-medium text-blue-300">MW AM (1–5)</th>
                <th className="py-2.5 pr-4 w-40 font-medium text-cyan-300">VHF FM (1–5)</th>
                <th className="py-2.5 font-medium">Ethiopian Engineering Justification</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  dim: 'Implementation Complexity',
                  am: '4 / 5 (High)',
                  fm: '2 / 5 (single site) · 4 / 5 (regional relay chain)',
                  just: 'High-power MW AM requires linear/PWM Class-D high-voltage modulation handling 4× peak envelope power, impedance-matching antenna tuning units (ATUs), and extensive site land. Single-site VHF FM uses modular solid-state Class-C/LDMOS amplifiers; covering wide rural Ethiopian corridors via FM relays adds STL microwave/satellite synchronization complexity.',
                },
                {
                  dim: 'Installation Complexity',
                  am: '5 / 5 (Very High)',
                  fm: '2 / 5 (urban rooftop) · 3 / 5 (remote hilltop)',
                  just: 'A quarter-wave MW AM radiator (~75 m at 1000 kHz) requires a base-insulated guyed mast and 60–120 buried copper ground radials across flat conductive soil. VHF FM uses compact 1.5–3 m dipole/Yagi bays mounted on existing rooftop or hilltop towers (e.g., Entoto), though remote hilltops require access roads and STL links.',
                },
                {
                  dim: 'Receiver Complexity',
                  am: '1 / 5 (Very Low)',
                  fm: '2 / 5 (integrated CMOS) · 3 / 5 (discrete)',
                  just: 'A non-coherent AM envelope detector needs only a tuned RF tank, diode rectifier, and RC filter (1/5 hardware complexity). FM requires IF hard limiting, quadrature I/Q or PLL discrimination, and de-emphasis, though modern single-chip CMOS tuners make consumer FM smartphones and portable radios inexpensive.',
                },
                {
                  dim: 'Maintenance Complexity',
                  am: '4 / 5 (High)',
                  fm: '2 / 5 (urban) · 3 / 5 (remote hilltop)',
                  just: 'AM masts face direct lightning exposure during Kiremt storms (June–September), ground-radial corrosion, ATU arcing under high RF voltage, and heavy diesel backup servicing. Solid-state FM racks allow hot-swappable PA pallet replacement, though remote rural relay sites require road-access and battery/solar security upkeep.',
                },
              ].map((row) => (
                <tr key={row.dim} className="border-b border-slate-800/70 align-top">
                  <td className="py-3 pr-4 font-medium text-slate-200">{row.dim}</td>
                  <td className="py-3 pr-4 font-mono tabular-nums text-blue-300">{row.am}</td>
                  <td className="py-3 pr-4 font-mono tabular-nums text-cyan-300">{row.fm}</td>
                  <td className="py-3 text-slate-300">{row.just}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sourced Facts vs Illustrative Assumptions & Direct References */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Evidence Classification: Verified Facts vs. Illustrative Engineering Assumptions
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            This laboratory strictly separates established physical/regulatory standards from site-dependent planning assumptions so no illustrative numbers are mistaken for empirical Ethiopian field surveys or official vendor quotes.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          <div className="bg-[#080D16] border border-emerald-800/40 rounded p-3.5 space-y-2">
            <div className="font-semibold text-emerald-300">
              1. Sourced Physical, Geographic &amp; Regulatory Facts
            </div>
            <ul className="text-slate-300 list-disc pl-4 space-y-1.5 leading-relaxed">
              <li>
                <strong className="text-slate-100">ITU Region 1 vs. National Allocations:</strong> ITU Region 1 international allocation tables define Medium-Wave AM as <span className="font-mono">526.5–1606.5 kHz</span> (9 kHz channel spacing) and VHF FM as <span className="font-mono">87.5–108 MHz</span> (<span className="font-mono">100 kHz</span> standard Region 1 channel spacing, with integral multiples permitted where applicable; <span className="font-mono">±75 kHz</span> nominal deviation, ITU-R BS.450-4). Applicable Ethiopian national frequency assignments and specific station authorizations are governed separately by national regulation rather than assumed from generic tables.
              </li>
              <li>
                <strong className="text-slate-100">Radio Propagation Physics:</strong> MF signals propagate via ground wave (diffracting over terrain, governed by ground conductivity in ITU-R P.368-10) and nocturnal ionospheric sky wave; VHF FM relies primarily on line-of-sight and terrain diffraction (ITU-R P.1546-6).
              </li>
              <li>
                <strong className="text-slate-100">Ethiopian Terrain &amp; Seasonal Climate:</strong> Major highland plateaus (2,000–4,000+ m), deep rift/river gorges (e.g., Abay), and the June–September Kiremt monsoon convective lightning season increase MF atmospheric noise and mast surge risk.
              </li>
              <li>
                <strong className="text-slate-100">Distinct Ethiopian Institutional Roles:</strong> The <strong className="text-slate-100">Ethiopian Communications Authority (ECA)</strong> manages spectrum allocation, frequency assignment, and technical radiocommunication regulation; the <strong className="text-slate-100">Ethiopian Media Authority (EMA)</strong> oversees broadcasting service licensing and media content regulation.
              </li>
            </ul>
          </div>

          <div className="bg-[#080D16] border border-amber-800/40 rounded p-3.5 space-y-2">
            <div className="font-semibold text-amber-300">
              2. Illustrative Engineering Assumptions (Not Site Measurements)
            </div>
            <ul className="text-slate-300 list-disc pl-4 space-y-1.5 leading-relaxed">
              <li>
                <strong className="text-slate-100">Coverage &amp; Power Ranges:</strong> Example transmitter power classes (e.g., 10–100+ kW MW vs. 5 kW FM relays) and nominal VHF radius ranges (15–50 km) are illustrative engineering planning envelopes; real coverage depends on ERP, antenna height above average terrain (HAAT), and path loss modeling.
              </li>
              <li>
                <strong className="text-slate-100">Qualitative Scores (1–5):</strong> Complexity ratings and Section 9 MCDA scores reflect comparative engineering trade-offs rather than statistical survey data.
              </li>
              <li>
                <strong className="text-slate-100">Financial &amp; Tariff Inputs (Section 8):</strong> All ETB hardware prices, EEU grid tariff examples, diesel burn rates, inflation, and discount rates are user-editable planning estimates—not verified procurement bids.
              </li>
              <li>
                <strong className="text-slate-100">Baseband Lab Scope (Sections 2–6):</strong> Simulates 3–5 kHz speech/tone modulation under matched channel power (<span className="font-mono">P_ref</span>) and AWGN; real broadcast path loss and atmospheric impulse bursts differ from pure Gaussian white noise.
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-3">
          <div className="text-xs font-semibold text-slate-200 mb-1.5">Direct Institutional &amp; Technical References</div>
          <ul className="text-xs text-slate-400 list-disc pl-5 space-y-1">
            <li>
              <strong className="text-slate-300">ITU-R P.368-10:</strong> Ground-wave propagation curves for frequencies between 10 kHz and 30 MHz —{' '}
              <a
                href="https://www.itu.int/rec/R-REC-P.368/en"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline font-mono text-[11px]"
              >
                itu.int/rec/R-REC-P.368
              </a>
            </li>
            <li>
              <strong className="text-slate-300">ITU-R P.1546-6:</strong> Method for point-to-area predictions for terrestrial services in the frequency range 30 MHz to 4,000 MHz —{' '}
              <a
                href="https://www.itu.int/rec/R-REC-P.1546/en"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline font-mono text-[11px]"
              >
                itu.int/rec/R-REC-P.1546
              </a>
            </li>
            <li>
              <strong className="text-slate-300">ITU-R BS.450-4:</strong> Transmission standards for FM sound broadcasting at VHF (±75 kHz deviation, 50 μs Region 1 pre-emphasis) —{' '}
              <a
                href="https://www.itu.int/rec/R-REC-BS.450/en"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline font-mono text-[11px]"
              >
                itu.int/rec/R-REC-BS.450
              </a>
            </li>
            <li>
              <strong className="text-slate-300">Ethiopian Communications Authority (ECA):</strong> National Frequency Allocation Table &amp; radiocommunication regulations —{' '}
              <a
                href="https://eca.et/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline font-mono text-[11px]"
              >
                eca.et
              </a>
            </li>
            <li>
              <strong className="text-slate-300">Ethiopian Media Authority (EMA):</strong> National public, commercial, and community broadcast licensing framework —{' '}
              <a
                href="https://ema.gov.et/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline font-mono text-[11px]"
              >
                ema.gov.et
              </a>
            </li>
            <li>
              <strong className="text-slate-300">Ethiopian Electric Utility (EEU):</strong> Grid electricity supply and commercial tariff framework —{' '}
              <a
                href="https://www.eeu.gov.et/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline font-mono text-[11px]"
              >
                eeu.gov.et
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
