-- ============================================================
-- JEE SYLLABUS SEED — Physics, Chemistry, Mathematics
-- Covers JEE Main + Advanced official syllabus (NTA 2024)
-- ============================================================

DO $$
DECLARE
  physics_id    uuid;
  chemistry_id  uuid;
  math_id       uuid;
  ch            uuid;  -- chapter id (reused)
BEGIN

  SELECT id INTO physics_id    FROM subjects WHERE name = 'Physics';
  SELECT id INTO chemistry_id  FROM subjects WHERE name = 'Chemistry';
  SELECT id INTO math_id       FROM subjects WHERE name = 'Mathematics';

  -- ══════════════════════════════════════════════════════════
  -- PHYSICS
  -- ══════════════════════════════════════════════════════════

  -- 1. Units and Measurements
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Units and Measurements', ARRAY['JEE']::exam_type[], 1, 3.33,
            'Physical quantities, SI units, dimensional analysis, errors and significant figures')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Physical Quantities and SI Units',
      'Classification of physical quantities (fundamental and derived); SI base units and their definitions; supplementary units (radian, steradian).',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Dimensional Analysis',
      'Dimensions of physical quantities; dimensional formulae; applications—checking correctness of equations, deriving relations, unit conversion.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Errors and Significant Figures',
      'Types of errors (systematic, random, absolute, relative, percentage); propagation of errors in arithmetic operations; significant figures and rounding.',
      'Easy', ARRAY['JEE']::exam_type[]);

  -- 2. Kinematics
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Kinematics', ARRAY['JEE']::exam_type[], 2, 3.33,
            'Motion in 1D and 2D, projectile motion, relative motion, circular motion kinematics')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Motion in a Straight Line',
      'Displacement, velocity, acceleration; equations of motion for uniform acceleration; velocity-time and position-time graphs; free fall.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Projectile Motion',
      'Motion under gravity in a plane; range, maximum height, time of flight; horizontal projectile; oblique projectile on inclined planes.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Relative Motion',
      'Relative velocity in 1D and 2D; minimum distance of closest approach; river-boat problems; rain-man problems.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Uniform Circular Motion',
      'Angular displacement, angular velocity, angular acceleration; centripetal acceleration; relation between linear and angular quantities.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 3. Laws of Motion
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Laws of Motion', ARRAY['JEE']::exam_type[], 3, 3.33,
            'Newton''s three laws, friction, constraint motion, circular dynamics')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Newton''s Laws of Motion',
      'Inertia and Newton''s First Law; momentum and Newton''s Second Law (F = dp/dt); Newton''s Third Law and action-reaction pairs.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Friction',
      'Static, kinetic and rolling friction; laws of friction; angle of friction and repose; friction on inclined planes; pseudoforce in non-inertial frames.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Constraint Motion and Pulleys',
      'String and pulley constraints; Atwood machine; wedge-block systems; constraint equations using differentiation.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Circular Dynamics',
      'Centripetal force; banking of roads; conical pendulum; vertical circular motion; critical velocity at top and bottom.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 4. Work, Energy and Power
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Work, Energy and Power', ARRAY['JEE']::exam_type[], 4, 6.67,
            'Work-energy theorem, conservative forces, collisions')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Work and Work-Energy Theorem',
      'Work done by constant and variable forces; work-energy theorem; kinetic energy; work done by spring force.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Potential Energy and Conservation',
      'Conservative and non-conservative forces; gravitational and elastic potential energy; conservation of mechanical energy; potential energy curves.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Power',
      'Average and instantaneous power; power-velocity relation (P = Fv); efficiency of machines.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Collisions',
      'Elastic and inelastic collisions in 1D and 2D; coefficient of restitution; oblique collisions; centre of mass frame.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 5. Rotational Motion
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'System of Particles and Rotational Motion', ARRAY['JEE']::exam_type[], 5, 6.67,
            'Centre of mass, moment of inertia, torque, angular momentum, rolling motion')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Centre of Mass',
      'Centre of mass of discrete and continuous systems; motion of centre of mass; impulse-momentum theorem for a system.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Moment of Inertia',
      'Definition of moment of inertia; theorems of parallel and perpendicular axes; MI of standard bodies (ring, disk, sphere, rod, cylinder).',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Torque and Angular Momentum',
      'Torque; angular momentum of a particle and rigid body; Newton''s second law for rotation (τ = Iα); conservation of angular momentum.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Rolling Motion',
      'Rolling without slipping; kinetic energy of rolling body; rolling on inclined plane; condition for rolling vs. sliding.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 6. Gravitation
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Gravitation', ARRAY['JEE']::exam_type[], 6, 3.33,
            'Newton''s law, gravitational potential, satellites, Kepler''s laws')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Newton''s Law of Gravitation',
      'Gravitational force; gravitational constant G; variation of g with altitude, depth, latitude and rotation of Earth.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Gravitational Field and Potential',
      'Gravitational field intensity; potential due to point mass, shell, sphere; relation E = -dV/dr; gravitational potential energy.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Satellites and Orbital Mechanics',
      'Orbital velocity and time period; geostationary satellites; escape velocity; binding energy; energy of a satellite in orbit.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Kepler''s Laws',
      'Law of orbits (ellipses); law of areas (equal areas); law of periods (T² ∝ R³); derivation from Newton''s law.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 7. Properties of Solids
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Mechanical Properties of Solids', ARRAY['JEE']::exam_type[], 7, 3.33,
            'Stress, strain, elastic moduli, Hooke''s law')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Stress, Strain and Elastic Moduli',
      'Longitudinal, shear and volumetric stress and strain; Young''s modulus, bulk modulus, modulus of rigidity; Poisson''s ratio.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Hooke''s Law and Elastic Energy',
      'Hooke''s law; elastic limit, yield point, breaking point; energy stored per unit volume; applications of elastic behaviour.',
      'Easy', ARRAY['JEE']::exam_type[]);

  -- 8. Fluid Mechanics
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Mechanical Properties of Fluids', ARRAY['JEE']::exam_type[], 8, 3.33,
            'Pressure, Archimedes, Bernoulli, viscosity, surface tension')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Fluid Pressure and Pascal''s Law',
      'Pressure at a depth; Pascal''s law and hydraulic machines; pressure variation in accelerating fluids.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Buoyancy and Archimedes'' Principle',
      'Upthrust; Archimedes'' principle; flotation condition; metacentre; variation of buoyancy with temperature.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Bernoulli''s Theorem and Applications',
      'Equation of continuity; Bernoulli''s theorem; Venturimeter; Torricelli''s theorem (velocity of efflux); Magnus effect.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Viscosity and Surface Tension',
      'Coefficient of viscosity; Poiseuille''s equation; Stokes'' law; terminal velocity; surface tension; angle of contact; capillarity.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 9. Thermal Properties
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Thermal Properties of Matter', ARRAY['JEE']::exam_type[], 9, 3.33,
            'Temperature scales, thermal expansion, specific heat, heat transfer')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Temperature and Thermal Expansion',
      'Temperature scales (Celsius, Kelvin, Fahrenheit); thermal expansion of solids, liquids and gases; anomalous expansion of water.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Specific Heat and Calorimetry',
      'Heat capacity; specific heat; latent heat; calorimetry and heat balance; specific heat of gases (Cp, Cv) and their ratio γ.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Modes of Heat Transfer',
      'Conduction (Fourier''s law, thermal conductivity); convection; radiation (Stefan-Boltzmann law, Wien''s displacement law, Newton''s law of cooling).',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 10. Thermodynamics
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Thermodynamics', ARRAY['JEE']::exam_type[], 10, 6.67,
            'Laws of thermodynamics, processes, Carnot engine, entropy')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Zeroth and First Law of Thermodynamics',
      'Thermal equilibrium; zeroth law; internal energy; first law (ΔU = Q - W); work done in different processes.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Thermodynamic Processes',
      'Isothermal, adiabatic, isochoric and isobaric processes; P-V diagrams; work done in each process; polytropic processes.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Second Law of Thermodynamics and Entropy',
      'Statements of second law (Kelvin-Planck, Clausius); entropy; irreversible processes; heat death of the universe.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Carnot Engine and Efficiency',
      'Carnot cycle; efficiency of heat engine; coefficient of performance of refrigerator; Carnot theorem.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 11. Kinetic Theory
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Kinetic Theory', ARRAY['JEE']::exam_type[], 11, 3.33,
            'Ideal gas, kinetic theory, degrees of freedom, equipartition theorem')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Kinetic Theory of Gases',
      'Assumptions of kinetic theory; pressure of ideal gas (P = ρu²/3); RMS, average and most probable speeds; Maxwell distribution.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Degrees of Freedom and Equipartition',
      'Degrees of freedom for mono-, di- and polyatomic molecules; law of equipartition of energy; Cv and Cp from equipartition.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Mean Free Path and Real Gases',
      'Mean free path; van der Waals equation and forces; compressibility factor; critical constants.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 12. Oscillations
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Oscillations', ARRAY['JEE']::exam_type[], 12, 3.33,
            'SHM, energy, pendulums, damped and forced oscillations')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Simple Harmonic Motion',
      'Conditions for SHM; x = A cos(ωt + φ); velocity, acceleration in SHM; phase difference; SHM as projection of uniform circular motion.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Energy in SHM and Simple Pendulum',
      'KE, PE and total energy in SHM; spring-mass system; simple and compound pendulum; seconds pendulum.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Damped and Forced Oscillations',
      'Damped SHM; underdamped, overdamped, critically damped; forced oscillations; resonance; quality factor.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 13. Waves
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Waves', ARRAY['JEE']::exam_type[], 13, 3.33,
            'Wave equation, sound, superposition, standing waves, Doppler effect')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Wave Equation and Speed of Sound',
      'Transverse and longitudinal waves; wave equation y = A sin(kx - ωt); speed of sound in solids, liquids, gases; Newton''s and Laplace''s formula.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Principle of Superposition and Interference',
      'Superposition of waves; constructive and destructive interference; beats; beat frequency.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Standing Waves and Resonance',
      'Formation of standing waves; nodes and antinodes; harmonics in strings and organ pipes (open and closed); Melde''s experiment.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Doppler Effect',
      'Doppler effect for sound and light; apparent frequency formula for various cases (source/observer moving); sonic boom.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 14. Electric Charges and Fields
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Electric Charges and Fields', ARRAY['JEE']::exam_type[], 14, 3.33,
            'Coulomb''s law, electric field, field lines, Gauss''s law')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Coulomb''s Law and Superposition',
      'Quantisation and conservation of charge; Coulomb''s law; principle of superposition of electric forces; comparison of electric and gravitational forces.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Electric Field and Field Lines',
      'Electric field due to point charges, dipole, ring, disk; electric field lines; dipole moment; torque on dipole in uniform field.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Gauss''s Law and Applications',
      'Electric flux; Gauss''s law; applications—field due to infinite line, plane sheet, solid sphere, hollow sphere; conductors in electrostatic equilibrium.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 15. Electrostatic Potential and Capacitance
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Electrostatic Potential and Capacitance', ARRAY['JEE']::exam_type[], 15, 6.67,
            'Potential, capacitors, dielectrics, energy storage')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Electric Potential and Potential Energy',
      'Relation between E and V; potential due to point charge, dipole, system of charges; equipotential surfaces; potential energy of charge in external field.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Conductors and Capacitance',
      'Properties of conductors; Van de Graaff generator; capacitance of isolated sphere; parallel plate capacitor; capacitance formula.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Combination of Capacitors',
      'Series and parallel combinations; charge sharing; energy stored (U = CV²/2 = Q²/2C); energy loss in redistribution.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Dielectrics and Polarisation',
      'Polar and non-polar molecules; polarisation; dielectric constant; effect of dielectric on capacitance and energy; capacitor with dielectric.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 16. Current Electricity
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Current Electricity', ARRAY['JEE']::exam_type[], 16, 6.67,
            'Ohm''s law, Kirchhoff''s laws, Wheatstone bridge, EMF, RC circuits')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Ohm''s Law and Resistance',
      'Electric current; drift velocity and current density; Ohm''s law; resistivity and conductivity; temperature dependence of resistance; colour code for resistors.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Kirchhoff''s Laws',
      'Kirchhoff''s current law (KCL); Kirchhoff''s voltage law (KVL); solving circuit networks; star-delta transformation.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Wheatstone Bridge and Meter Bridge',
      'Balanced Wheatstone bridge; metre bridge; post office box; potentiometer—comparison of EMFs, internal resistance measurement.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'EMF, Internal Resistance and Cells',
      'EMF and terminal potential difference; cells in series, parallel and mixed groups; maximum power transfer theorem.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 17. Magnetic Effects of Current
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Moving Charges and Magnetism', ARRAY['JEE']::exam_type[], 17, 3.33,
            'Biot-Savart, Ampere, Lorentz force, cyclotron, galvanometer')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Biot-Savart Law',
      'Magnetic field due to current element; field at centre of circular loop; field on axis of circular loop; solenoid and toroid.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Ampere''s Circuital Law',
      'Ampere''s law; field due to long straight wire, infinite plane, solenoid, toroid using Ampere''s law.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Lorentz Force and Motion of Charges',
      'Lorentz force (F = qv × B); circular, helical motion; radius and time period; velocity selector; Hall effect.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Force on Current-carrying Conductor',
      'Force on straight and curved conductors; force between parallel currents; torque on current loop; magnetic dipole moment.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Galvanometer, Ammeter and Voltmeter',
      'Moving coil galvanometer; figure of merit; conversion to ammeter (shunt) and voltmeter (series resistance); cyclotron.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 18. Magnetism and Matter
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Magnetism and Matter', ARRAY['JEE']::exam_type[], 18, 3.33,
            'Bar magnet, Earth''s magnetism, dia/para/ferromagnetism')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Bar Magnet and Magnetic Dipole',
      'Magnetic dipole and moment; field on axial and equatorial points; torque in uniform field; potential energy; current loop as dipole.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Earth''s Magnetism',
      'Geographic and magnetic meridian; declination, dip and horizontal component; tangent galvanometer; vibration magnetometer.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Magnetic Properties of Materials',
      'Magnetisation and magnetic intensity; susceptibility; diamagnetic, paramagnetic, ferromagnetic materials; Curie''s law; hysteresis.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 19. Electromagnetic Induction
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Electromagnetic Induction', ARRAY['JEE']::exam_type[], 19, 3.33,
            'Faraday''s laws, Lenz''s law, self/mutual inductance, eddy currents')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Faraday''s Laws and Lenz''s Law',
      'Magnetic flux; Faraday''s first and second law; Lenz''s law; motional EMF; EMF in rotating coil.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Self and Mutual Inductance',
      'Self-inductance (L); energy stored in inductor (U = LI²/2); mutual inductance (M); coefficient of coupling; solenoid and toroid inductance.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Eddy Currents',
      'Origin of eddy currents; applications (braking, induction furnace, speedometer); minimisation using laminations.',
      'Easy', ARRAY['JEE']::exam_type[]);

  -- 20. Alternating Current
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Alternating Current', ARRAY['JEE']::exam_type[], 20, 3.33,
            'AC circuits, impedance, resonance, power, transformers')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'AC Circuits with R, L and C',
      'Peak and RMS values; phasors; impedance and reactance; phase angle in RL, RC and RLC circuits; power factor.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Series LCR Resonance',
      'Resonance condition (ω₀ = 1/√LC); quality factor Q; bandwidth; sharpness of resonance; half-power frequencies.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Power in AC Circuits and Transformers',
      'Average power; wattless current; power factor; ideal and practical transformer; step-up and step-down; energy losses.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 21. Electromagnetic Waves
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Electromagnetic Waves', ARRAY['JEE']::exam_type[], 21, 3.33,
            'Maxwell equations, EM spectrum, properties of EM waves')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Maxwell''s Equations and Displacement Current',
      'Modification of Ampere''s law; displacement current; Maxwell''s four equations (qualitative); prediction of EM waves.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Electromagnetic Spectrum',
      'Types of EM waves (radio, microwave, IR, visible, UV, X-ray, gamma); wavelength ranges; properties and applications.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Properties of EM Waves',
      'Transverse nature; speed of light; energy density; intensity; radiation pressure; Poynting vector.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 22. Ray Optics
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Ray Optics and Optical Instruments', ARRAY['JEE']::exam_type[], 22, 3.33,
            'Reflection, refraction, TIR, lenses, mirrors, optical instruments')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Reflection and Spherical Mirrors',
      'Laws of reflection; mirror formula (1/v + 1/u = 1/f); magnification; images in concave and convex mirrors; sign convention.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Refraction and Snell''s Law',
      'Laws of refraction; refractive index; apparent depth; normal shift; refraction at spherical surfaces; lens-maker''s equation.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Total Internal Reflection',
      'Critical angle; total internal reflection; applications—optical fibres, mirage, brilliance of diamond, periscope.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Lenses and Lens Systems',
      'Thin lens formula; magnification; power of lens; combination of lenses; silvered lens; displacement method for f.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Optical Instruments',
      'Simple and compound microscope; astronomical and terrestrial telescope; magnifying power; resolving power; human eye defects and correction.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 23. Wave Optics
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Wave Optics', ARRAY['JEE']::exam_type[], 23, 3.33,
            'Huygens'' principle, YDSE, diffraction, polarisation')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Huygens'' Principle and Interference',
      'Huygens'' construction; wavefronts; coherent sources; Young''s double slit experiment; fringe width β = λD/d; conditions for bright and dark fringes.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Diffraction',
      'Single-slit diffraction; condition for minima; secondary maxima; angular resolution; Rayleigh criterion; diffraction grating.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Polarisation',
      'Polarisation of light; Malus''s law; polaroids; Brewster''s angle; polarisation by scattering; optical activity.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 24. Dual Nature of Radiation and Matter
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Dual Nature of Radiation and Matter', ARRAY['JEE']::exam_type[], 24, 3.33,
            'Photoelectric effect, de Broglie hypothesis, Davisson-Germer')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Photoelectric Effect',
      'Einstein''s photoelectric equation; work function; threshold frequency; stopping potential; laws of photoelectric emission; Millikan''s experiment.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'De Broglie Hypothesis',
      'Matter waves; de Broglie wavelength (λ = h/p); wavelength of electron, proton, neutron; Davisson-Germer experiment.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Heisenberg''s Uncertainty Principle',
      'Position-momentum uncertainty (Δx·Δp ≥ ℏ/2); energy-time uncertainty; wave-particle duality; Copenhagen interpretation.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 25. Atoms
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Atoms', ARRAY['JEE']::exam_type[], 25, 3.33,
            'Rutherford model, Bohr model, hydrogen spectrum')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Rutherford''s Nuclear Model',
      'Alpha particle scattering; distance of closest approach; nuclear radius; Rutherford''s model—nucleus and electrons; limitations.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Bohr''s Model of Hydrogen Atom',
      'Bohr''s postulates; radius of nth orbit (rₙ = n²a₀); velocity and energy of electron; ionisation energy; correspondence principle.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Hydrogen Spectrum and Spectral Series',
      'Rydberg formula; Lyman, Balmer, Paschen, Brackett, Pfund series; photon emission and absorption; energy level diagrams.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 26. Nuclei
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Nuclei', ARRAY['JEE']::exam_type[], 26, 3.33,
            'Nuclear composition, radioactivity, binding energy, fission, fusion')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Nuclear Composition and Size',
      'Protons and neutrons; atomic number, mass number, isotopes; nuclear radius (R = R₀A^(1/3)); nuclear density; mass-energy equivalence.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Radioactivity and Decay Law',
      'Alpha, beta, gamma decay; radioactive decay law (N = N₀e^(-λt)); half-life; mean life; activity; radioactive equilibrium.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Binding Energy and Nuclear Reactions',
      'Mass defect; binding energy per nucleon; BE curve; nuclear fission and chain reaction; nuclear fusion; Q-value calculation.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 27. Semiconductor Electronics
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (physics_id, 'Semiconductor Electronics', ARRAY['JEE']::exam_type[], 27, 3.33,
            'Semiconductors, p-n junction, transistors, logic gates')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, physics_id, 'Semiconductors and Band Theory',
      'Energy bands; conductor, insulator, semiconductor; intrinsic and extrinsic semiconductors; n-type and p-type; Fermi level.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'p-n Junction Diode',
      'Formation of depletion region; forward and reverse bias; I-V characteristic; rectifier (half-wave, full-wave); Zener diode as voltage regulator.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Transistor and Amplifier',
      'n-p-n and p-n-p transistors; CB, CE, CC configurations; transistor as switch and amplifier; current gain α and β.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, physics_id, 'Logic Gates and Boolean Algebra',
      'AND, OR, NOT, NAND, NOR, XOR gates; truth tables; Boolean algebra; De Morgan''s theorems; universal gates.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- ══════════════════════════════════════════════════════════
  -- CHEMISTRY
  -- ══════════════════════════════════════════════════════════

  -- 1. Basic Concepts of Chemistry
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Some Basic Concepts of Chemistry', ARRAY['JEE']::exam_type[], 1, 3.33,
            'Mole concept, stoichiometry, empirical formula, limiting reagent')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Mole Concept and Avogadro''s Number',
      'Atomic and molecular mass; mole; Avogadro''s number; molar mass; gram-atomic and gram-molecular mass.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Stoichiometry and Limiting Reagent',
      'Mole-mass calculations; limiting reagent; % yield; % purity; stoichiometry of reactions in solution (molarity).',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Empirical and Molecular Formula',
      'Elemental analysis; empirical formula from % composition; molecular formula from empirical formula and molar mass.',
      'Easy', ARRAY['JEE']::exam_type[]);

  -- 2. Atomic Structure
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Structure of Atom', ARRAY['JEE']::exam_type[], 2, 6.67,
            'Bohr model, quantum numbers, orbitals, electronic configuration')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Atomic Models and Hydrogen Spectrum',
      'Thomson''s and Rutherford''s models; Bohr''s model; spectral lines; Rydberg equation; limitations of Bohr''s model.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Quantum Numbers and Orbitals',
      'Principal (n), azimuthal (l), magnetic (m), spin (s) quantum numbers; shapes of s, p, d orbitals; orbital energy in multi-electron atoms.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Electronic Configuration',
      'Aufbau principle; Pauli exclusion principle; Hund''s rule; electronic configuration of elements up to Z=36; exceptions (Cr, Cu).',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Dual Nature and Uncertainty Principle',
      'de Broglie wavelength; photoelectric effect in context of chemistry; Heisenberg uncertainty principle; wave functions and probability density.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 3. Periodic Table
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Classification of Elements and Periodicity', ARRAY['JEE']::exam_type[], 3, 3.33,
            'Periodic law, periodic trends, blocks of periodic table')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Modern Periodic Law and Table',
      'Mendeleev and Moseley''s periodic law; s, p, d, f blocks; groups and periods; IUPAC nomenclature of elements Z > 100.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Periodic Trends',
      'Atomic/ionic radius; ionisation enthalpy; electron gain enthalpy; electronegativity; metallic character; anomalous properties of second period elements.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 4. Chemical Bonding
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Chemical Bonding and Molecular Structure', ARRAY['JEE']::exam_type[], 4, 6.67,
            'Ionic, covalent bonding, VSEPR, hybridisation, MOT, hydrogen bonding')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Ionic and Covalent Bonding',
      'Kossel-Lewis approach; lattice energy; Born-Haber cycle; Lewis dot structures; formal charge; resonance structures.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'VSEPR Theory',
      'VSEPR model; electron pair geometry vs molecular geometry; bond angles; shapes of molecules (linear, V-shaped, pyramidal, tetrahedral, trigonal bipyramidal, octahedral).',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Hybridisation and Molecular Geometry',
      'sp, sp², sp³, sp³d, sp³d² hybridisation; geometry and bond angles; d-orbital participation; bent rule.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Molecular Orbital Theory',
      'LCAO method; bonding and antibonding MOs; MO diagrams of H₂, O₂, N₂, F₂; bond order; paramagnetism of O₂.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Intermolecular Forces and Hydrogen Bonding',
      'van der Waals forces; dipole-dipole; London dispersion; hydrogen bonding (intermolecular vs intramolecular); effect on physical properties.',
      'Easy', ARRAY['JEE']::exam_type[]);

  -- 5. States of Matter
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'States of Matter', ARRAY['JEE']::exam_type[], 5, 3.33,
            'Gas laws, ideal gas equation, van der Waals, kinetic theory')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Gas Laws',
      'Boyle''s law; Charles'' law; Gay-Lussac''s law; Avogadro''s law; combined gas law; Dalton''s law of partial pressures; Graham''s law of diffusion.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Ideal Gas Equation and Kinetic Theory',
      'PV = nRT; molar volume at STP; kinetic molecular theory; Maxwell speed distribution; average, RMS and most probable speeds; deviation from ideal behaviour.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'van der Waals Equation and Real Gases',
      'van der Waals equation; a and b constants; compressibility factor Z; critical constants; liquefaction of gases; Boyle temperature.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 6. Thermodynamics (Chemistry)
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Thermodynamics', ARRAY['JEE']::exam_type[], 6, 6.67,
            'Internal energy, enthalpy, Hess''s law, entropy, Gibbs energy')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Internal Energy and First Law',
      'System and surroundings; intensive and extensive properties; first law (ΔU = q + w); enthalpy (H = U + PV); heat at constant P and V.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Enthalpy and Hess''s Law',
      'Standard enthalpy of formation, combustion, neutralisation; bond enthalpy; Hess''s law of constant heat summation; Born-Haber cycle.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Entropy and Second Law',
      'Entropy; spontaneity; second law; entropy change in isothermal expansion; entropy of universe; third law; standard molar entropy.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Gibbs Free Energy',
      'Gibbs energy G = H - TS; spontaneity criterion (ΔG < 0); relation between ΔG and equilibrium constant (ΔG° = -RT ln K).',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 7. Chemical Equilibrium
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Equilibrium', ARRAY['JEE']::exam_type[], 7, 6.67,
            'Law of mass action, Kp, Kc, Le Chatelier, ionic equilibrium, pH, buffers')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Chemical Equilibrium and Equilibrium Constant',
      'Law of mass action; Kc and Kp; relation Kp = Kc(RT)^Δn; Q vs K; Le Chatelier''s principle; effect of P, T, V, catalyst on equilibrium.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Ionic Equilibrium and pH',
      'Strong and weak electrolytes; Arrhenius, Brønsted-Lowry, Lewis concepts; pH; Kw; Ka and Kb; degree of dissociation; hydrolysis of salts.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Buffer Solutions and Solubility',
      'Buffer solutions; Henderson-Hasselbalch equation; buffer capacity; solubility product (Ksp); common ion effect; applications.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 8. Redox Reactions
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Redox Reactions', ARRAY['JEE']::exam_type[], 8, 3.33,
            'Oxidation number, balancing redox, electrochemical series')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Oxidation State and Redox Reactions',
      'Oxidation number rules; oxidising and reducing agents; disproportionation; identifying redox reactions; types (combination, decomposition, displacement).',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Balancing Redox Reactions',
      'Oxidation number method; half-reaction (ion-electron) method; balancing in acidic and basic medium.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 9. Electrochemistry
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Electrochemistry', ARRAY['JEE']::exam_type[], 9, 6.67,
            'Electrochemical cells, Nernst equation, electrolysis, conductance')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Electrochemical Cells and EMF',
      'Galvanic cell; Daniel cell; cell notation; standard electrode potential; standard cell EMF (E°cell = E°cathode - E°anode); electrochemical series.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Nernst Equation',
      'Nernst equation (E = E° - RT/nF · ln Q); concentration cells; EMF and free energy (ΔG = -nFE); equilibrium constant from E°.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Electrolysis and Faraday''s Laws',
      'Electrolytic cells; products at electrodes; Faraday''s first and second laws; electroplating; electrolytic refining; numerical problems.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Conductance and Kohlrausch''s Law',
      'Conductance, conductivity, molar conductivity; variation with concentration; Kohlrausch''s law; limiting molar conductivity; transport number.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 10. Chemical Kinetics
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Chemical Kinetics', ARRAY['JEE']::exam_type[], 10, 6.67,
            'Rate law, order, integrated equations, Arrhenius, mechanisms')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Rate of Reaction and Rate Law',
      'Average and instantaneous rate; rate law; rate constant; order vs molecularity; pseudo-first-order reactions.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Integrated Rate Equations',
      'First-order integrated equation; half-life; zero-order reactions; second-order; radioactive decay analogy; graphical methods.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Arrhenius Equation and Activation Energy',
      'Arrhenius equation (k = Ae^(-Ea/RT)); activation energy from two temperatures; pre-exponential factor; temperature dependence of k.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Reaction Mechanisms',
      'Elementary steps; rate-determining step; intermediates; collision theory; transition state theory; examples of SN1, SN2 mechanisms.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 11. Surface Chemistry
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Surface Chemistry', ARRAY['JEE']::exam_type[], 11, 3.33,
            'Adsorption, catalysis, colloids, emulsions')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Adsorption and Freundlich Isotherm',
      'Physical and chemical adsorption; Freundlich adsorption isotherm; factors affecting adsorption; applications in industry.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Catalysis',
      'Homogeneous and heterogeneous catalysis; promoters and poisons; enzyme catalysis; acid-base catalysis; mechanism of heterogeneous catalysis.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Colloids and Emulsions',
      'Colloidal state; types of colloids; preparation and properties; Tyndall effect; Brownian motion; electrophoresis; coagulation; emulsions.',
      'Easy', ARRAY['JEE']::exam_type[]);

  -- 12. Solutions
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Solutions', ARRAY['JEE']::exam_type[], 12, 3.33,
            'Concentration, vapour pressure, Raoult''s law, colligative properties, van''t Hoff')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Types of Solutions and Concentration Terms',
      'Types of solutions; molarity, molality, mole fraction, normality, ppm; Henry''s law for gases in liquid.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Vapour Pressure and Raoult''s Law',
      'Vapour pressure; Raoult''s law for ideal solutions; positive and negative deviations; azeotropes; non-ideal solutions.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Colligative Properties',
      'Relative lowering of VP; elevation of boiling point; depression of freezing point; osmosis and osmotic pressure; van''t Hoff factor.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 13. General Principles of Metallurgy
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'General Principles of Extraction', ARRAY['JEE']::exam_type[], 13, 3.33,
            'Occurrence, concentration, extraction, refining of metals')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Occurrence and Concentration of Ores',
      'Types of ores; concentration methods (hand-picking, levigation, froth flotation, magnetic separation, leaching).',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Extraction and Refining',
      'Roasting, calcination, smelting; thermodynamic principles (Ellingham diagram); electrolytic reduction; refining (electrolytic, distillation, vapour phase).',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 14. Hydrogen
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Hydrogen', ARRAY['JEE']::exam_type[], 14, 3.33,
            'Properties, isotopes, water, heavy water, hydrogen peroxide')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Hydrogen: Properties and Preparation',
      'Position in periodic table; isotopes (protium, deuterium, tritium); hydrides; industrial preparation; uses as fuel.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Water and Hydrogen Peroxide',
      'Structure and anomalous properties of water; heavy water; hard and soft water; hydrogen peroxide: preparation, structure, properties, uses.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 15. s-Block Elements
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 's-Block Elements', ARRAY['JEE']::exam_type[], 15, 3.33,
            'Alkali metals, alkaline earth metals, anomalous properties of Li and Be')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Alkali Metals (Group 1)',
      'General properties; anomalous behaviour of Li; compounds (oxides, hydroxides, carbonates, bicarbonates); uses; flame test colours.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Alkaline Earth Metals (Group 2)',
      'General properties; anomalous behaviour of Be; important compounds of Mg and Ca; diagonal relationship; lime and plaster of Paris.',
      'Easy', ARRAY['JEE']::exam_type[]);

  -- 16. p-Block Elements
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'p-Block Elements', ARRAY['JEE']::exam_type[], 16, 6.67,
            'Groups 13-18: boron, carbon, nitrogen, oxygen, halogens, noble gases')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Group 13 and 14 Elements',
      'Boron: properties, allotropes, borax, boric acid, diborane. Carbon: allotropes, oxides (CO, CO₂). Silicon: silicates, silicones.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Group 15 Elements (Nitrogen Family)',
      'Nitrogen and phosphorus: allotropes; oxides, oxyacids (HNO₃, H₃PO₄); hydrides (NH₃, PH₃); structure of P₄O₁₀, P₄O₆.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Group 16 Elements (Oxygen Family)',
      'Oxygen and sulphur: allotropes; oxides, hydrides (H₂O, H₂S); oxyacids of sulphur (H₂SO₄, H₂SO₃); manufacture of H₂SO₄.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Halogens (Group 17) and Noble Gases (Group 18)',
      'Halogens: oxidising power, hydracids, oxyacids (HClO, HClO₃, HClO₄); interhalogen compounds. Noble gases: discovery, uses, XeF compounds.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 17. d and f Block Elements
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'd and f Block Elements', ARRAY['JEE']::exam_type[], 17, 6.67,
            'Transition metals, important compounds, lanthanides, actinides')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'General Properties of Transition Metals',
      'Electronic configuration; variable oxidation states; magnetic properties; colour of compounds; catalytic properties; alloy formation; interstitial compounds.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Important Compounds of d-Block',
      'KMnO₄: preparation, properties, reactions (acidic, basic, neutral medium); K₂Cr₂O₇: preparation, properties, oxidising agent reactions.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Lanthanides and Actinides',
      'Lanthanide contraction and its consequences; oxidation states; magnetic properties; uses; actinides—radioactive series; nuclear chemistry.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 18. Coordination Compounds
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Coordination Compounds', ARRAY['JEE']::exam_type[], 18, 6.67,
            'Werner theory, ligands, nomenclature, isomerism, CFT')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Werner''s Theory and Ligands',
      'Primary and secondary valency; central atom; ligands (mono-, bi-, polydentate; ambidentate; bridging); chelate effect; EAN rule.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'IUPAC Nomenclature of Coordination Compounds',
      'Rules for naming complexes; naming ligands; oxidation state from name; examples of complex naming.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Isomerism in Coordination Compounds',
      'Structural isomerism (ionisation, linkage, coordination, solvate); stereoisomerism (geometric and optical isomerism in octahedral and square planar complexes).',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Crystal Field Theory (CFT)',
      'Crystal field splitting (Δo for octahedral, Δt for tetrahedral); CFSE; high-spin vs low-spin; spectrochemical series; colour and magnetic properties from CFT.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 19. Basic Organic Chemistry
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Basic Principles of Organic Chemistry', ARRAY['JEE']::exam_type[], 19, 3.33,
            'IUPAC nomenclature, electronic effects, reaction intermediates, types of reactions')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'IUPAC Nomenclature and Isomerism',
      'Chain, position and functional group isomers; IUPAC naming of alkanes, cycloalkanes, alkenes, alkynes, and functional groups.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Electronic Effects in Organic Molecules',
      'Inductive effect (+I and -I); resonance and mesomeric effect (+M and -M); hyperconjugation; electromeric effect; effect on stability and reactivity.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Reaction Intermediates',
      'Carbocations (stability order: 3° > 2° > 1°); carbanions; free radicals; carbenes; nitrenes; arynes; their formation and reactions.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 20. Hydrocarbons
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Hydrocarbons', ARRAY['JEE']::exam_type[], 20, 3.33,
            'Alkanes, alkenes, alkynes, arenes, reactions and mechanisms')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Alkanes and Free Radical Halogenation',
      'Conformations (Newman projections); free radical mechanism; halogenation selectivity; cracking; combustion.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Alkenes and Electrophilic Addition',
      'Markovnikov''s rule; mechanism of electrophilic addition; anti-Markovnikov (HBr/peroxide); ozonolysis; polymerisation; Baeyer''s test.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Alkynes and Arenes',
      'Acidic nature of terminal alkynes; reactions of alkynes; aromaticity (Hückel rule); benzene structure; electrophilic aromatic substitution (EAS).',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 21. Haloalkanes and Haloarenes
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Organic Compounds Containing Halogens', ARRAY['JEE']::exam_type[], 21, 3.33,
            'SN1, SN2, elimination, aryl halides, polyhalogen compounds')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'SN1 and SN2 Reactions',
      'Nucleophilic substitution; SN1 mechanism (racemisation, 3° > 2° > 1°); SN2 mechanism (inversion, 1° > 2° > 3°); factors affecting; optical activity.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Elimination Reactions and Haloarenes',
      'E1 and E2 mechanisms; Saytzeff''s rule; dehydrohalogenation; nucleophilic aromatic substitution; reactions of chlorobenzene.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Polyhalogen Compounds',
      'CHCl₃ (chloroform), CCl₄, DDT, BHC, Freons; preparation, properties, uses and environmental impact.',
      'Easy', ARRAY['JEE']::exam_type[]);

  -- 22. Alcohols, Phenols and Ethers
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Alcohols, Phenols and Ethers', ARRAY['JEE']::exam_type[], 22, 3.33,
            'Preparation, reactions, acidic nature, phenols, ethers')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Alcohols: Preparation and Reactions',
      'Lucas test; oxidation (primary → aldehyde → acid; secondary → ketone); dehydration; esterification; reaction with active metals.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Phenols: Acidic Nature and Reactions',
      'Acidic nature of phenol (pKa ~ 10); Kolbe reaction; Reimer-Tiemann; Fries rearrangement; Claisen rearrangement; electrophilic substitution on phenol ring.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Ethers: Preparation and Properties',
      'Williamson synthesis; reactions with HI, PCl₅; cleavage; epoxides and their ring opening; THF as solvent.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 23. Aldehydes, Ketones and Carboxylic Acids
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Aldehydes, Ketones and Carboxylic Acids', ARRAY['JEE']::exam_type[], 23, 6.67,
            'Nucleophilic addition, condensation reactions, carboxylic acids, derivatives')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Nucleophilic Addition to Carbonyl Compounds',
      'Reactivity of aldehydes vs ketones; mechanism of nucleophilic addition; reactions with HCN, NaHSO₃, Grignard reagent, alcohols (hemiacetal/acetal).',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Aldol and Cannizzaro Reactions',
      'Aldol condensation (crossed and intramolecular); Cannizzaro reaction; Clemmensen and Wolff-Kishner reduction; α,β-unsaturated carbonyl compounds.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Carboxylic Acids and Derivatives',
      'Acidity of carboxylic acids; methods of preparation; reactions; acid chlorides, anhydrides, esters, amides—preparation and interconversions.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 24. Amines
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Amines', ARRAY['JEE']::exam_type[], 24, 3.33,
            'Classification, basic strength, reactions, diazonium salts')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Classification and Basic Nature of Amines',
      'Primary, secondary, tertiary amines and quaternary ammonium salts; basicity order; Hinsberg test; separation of amines.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Reactions of Amines and Diazonium Salts',
      'Alkylation; acylation; electrophilic aromatic substitution; carbylamine reaction; diazotisation; Sandmeyer, Balz-Schiemann, Gattermann reactions; azo dyes.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 25. Biomolecules
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Biomolecules', ARRAY['JEE']::exam_type[], 25, 3.33,
            'Carbohydrates, proteins, nucleic acids, enzymes, vitamins')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Carbohydrates',
      'Classification (mono, di, polysaccharides); glucose and fructose structures (open chain and ring form); Haworth projections; mutarotation; reducing sugars.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Proteins and Amino Acids',
      'Amino acids (essential and non-essential); zwitterion; peptide bond; primary, secondary, tertiary, quaternary structure; denaturation; enzymes.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Nucleic Acids, Vitamins and Hormones',
      'DNA and RNA structure; bases (purines and pyrimidines); Watson-Crick model; genetic code; fat-soluble and water-soluble vitamins.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 26. Polymers
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Polymers', ARRAY['JEE']::exam_type[], 26, 3.33,
            'Classification, addition and condensation polymers, rubber, copolymers')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Classification and Addition Polymers',
      'Natural and synthetic polymers; classification (thermoplastic, thermosetting); addition polymers—PE, PVC, Teflon, polystyrene, Orlon; mechanism.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Condensation Polymers and Rubber',
      'Condensation polymers—Nylon 6, Nylon 6,6; Dacron (Terylene); Bakelite; natural rubber; vulcanisation; synthetic rubber (Buna-S, Buna-N, Neoprene).',
      'Easy', ARRAY['JEE']::exam_type[]);

  -- 27. Chemistry in Everyday Life
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (chemistry_id, 'Chemistry in Everyday Life', ARRAY['JEE']::exam_type[], 27, 3.33,
            'Drugs, food additives, detergents')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, chemistry_id, 'Drugs and Medicines',
      'Analgesics, antibiotics, antiseptics, disinfectants; antacids; antihistamines; tranquilisers; antimalarials; drug-receptor interaction.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, chemistry_id, 'Food Chemistry and Detergents',
      'Food additives (preservatives, antioxidants, colouring agents); artificial sweeteners; soaps and detergents; cleansing mechanism; biodegradability.',
      'Easy', ARRAY['JEE']::exam_type[]);

  -- ══════════════════════════════════════════════════════════
  -- MATHEMATICS
  -- ══════════════════════════════════════════════════════════

  -- 1. Sets, Relations and Functions
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (math_id, 'Sets, Relations and Functions', ARRAY['JEE']::exam_type[], 1, 3.33,
            'Set operations, types of relations and functions, inverse, composition')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, math_id, 'Sets and Set Operations',
      'Types of sets (empty, finite, infinite, power set); union, intersection, difference, complement; Venn diagrams; De Morgan''s laws; n(A∪B∪C) formula.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Relations and Functions',
      'Cartesian product; domain, range, codomain; types of relations (reflexive, symmetric, transitive, equivalence); types of functions (one-one, onto, bijective).',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Inverse Functions and Composition',
      'Invertible functions; inverse function; composition of functions (fog, gof); identifying domain and range of composite functions; even and odd functions.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 2. Complex Numbers
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (math_id, 'Complex Numbers and Quadratic Equations', ARRAY['JEE']::exam_type[], 2, 6.67,
            'Algebra, Argand plane, de Moivre''s theorem, roots, quadratic equations')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, math_id, 'Algebra of Complex Numbers',
      'Definition z = a + ib; modulus and argument; conjugate; algebraic operations; equality; properties of modulus and argument.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Argand Plane and Polar Form',
      'Argand plane; geometrical interpretation of addition/multiplication; polar form; exponential form (Euler''s formula); rotation formula.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'De Moivre''s Theorem and nth Roots',
      'De Moivre''s theorem; nth roots of unity; cube roots of unity (ω); |z₁ ± z₂|² identities; locus problems in complex plane.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Quadratic Equations',
      'Roots and discriminant; nature of roots; sum and product of roots; relation between roots and coefficients; common roots; biquadratic equations.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 3. Matrices and Determinants
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (math_id, 'Matrices and Determinants', ARRAY['JEE']::exam_type[], 3, 6.67,
            'Matrix algebra, determinants, inverse, system of equations')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, math_id, 'Matrix Types and Operations',
      'Types of matrices (square, diagonal, identity, symmetric, skew-symmetric, orthogonal); addition, scalar multiplication, multiplication; transpose.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Determinants and Properties',
      'Evaluation of 2×2 and 3×3 determinants; properties of determinants; cofactors and minors; adjoint; area of triangle using determinant.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Inverse Matrix and Cramer''s Rule',
      'Inverse of a matrix (A⁻¹ = adj(A)/|A|); A(adj A) = |A|I; system of linear equations; consistent/inconsistent systems; Cramer''s rule.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 4. Permutations and Combinations
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (math_id, 'Permutations and Combinations', ARRAY['JEE']::exam_type[], 4, 3.33,
            'Fundamental theorem, nPr, nCr, circular permutations, multinomials')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, math_id, 'Fundamental Counting and Permutations',
      'Multiplication and addition principle; factorial; nPr; permutations with repetition; circular and necklace permutations; permutations with identical objects.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Combinations and Selection',
      'nCr and its properties; problems of selection; division into groups; distribution of identical objects; multinomial theorem for selection.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 5. Mathematical Induction
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (math_id, 'Mathematical Induction', ARRAY['JEE']::exam_type[], 5, 3.33,
            'Principle of mathematical induction, divisibility, sum of series')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, math_id, 'Principle of Mathematical Induction',
      'Weak and strong induction; proving summation formulas; proving divisibility; proving inequalities; applications.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 6. Binomial Theorem
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (math_id, 'Binomial Theorem', ARRAY['JEE']::exam_type[], 6, 3.33,
            'Binomial expansion, general term, middle term, properties of binomial coefficients')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, math_id, 'Binomial Expansion and General Term',
      'Binomial theorem for positive integers; Pascal''s triangle; general term T(r+1) = nCr · a^(n-r) · b^r; term independent of x.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Properties of Binomial Coefficients',
      'Sum of binomial coefficients; alternating sum; Vandermonde identity; greatest term; numerically greatest term; applications of binomial identities.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 7. Sequences and Series
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (math_id, 'Sequences and Series', ARRAY['JEE']::exam_type[], 7, 6.67,
            'AP, GP, HP, special series, AGM inequality')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, math_id, 'Arithmetic Progression (AP)',
      'nth term and sum of AP; arithmetic mean; insertion of means; properties of AP; problems on AP.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Geometric Progression (GP)',
      'nth term and sum of GP; infinite GP (|r| < 1); geometric mean; sum of infinite GP; recurring decimals.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Harmonic Progression and AGM Inequality',
      'Harmonic progression; harmonic mean; AM-GM-HM inequality; weighted means; applications in maxima-minima.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Special Series',
      'Sum of first n natural numbers; sum of squares; sum of cubes; method of differences; telescoping series; Σr, Σr², Σr³ formulas.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 8. Limits, Continuity and Differentiability
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (math_id, 'Limits, Continuity and Differentiability', ARRAY['JEE']::exam_type[], 8, 10.0,
            'Limits, L''Hopital, continuity, differentiability, standard derivatives')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, math_id, 'Limits and Standard Limits',
      'ε-δ definition; algebra of limits; standard limits (lim sinx/x, lim (1+1/n)^n, lim (aⁿ-bⁿ)/(a-b)); L''Hopital''s rule; limits at infinity.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Continuity and Types of Discontinuity',
      'Continuity of functions; left and right limits; removable, jump and infinite discontinuity; continuity of composite functions; IVT.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Differentiability and Derivatives',
      'Definition of derivative; relation between differentiability and continuity; left and right derivatives; derivatives of standard functions.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Rules of Differentiation',
      'Sum, product, quotient rules; chain rule; implicit differentiation; logarithmic differentiation; parametric differentiation; higher order derivatives.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 9. Applications of Derivatives
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (math_id, 'Applications of Derivatives', ARRAY['JEE']::exam_type[], 9, 6.67,
            'Tangents, normals, increasing/decreasing functions, maxima, minima, MVT')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, math_id, 'Tangents and Normals',
      'Slope of tangent and normal; equation of tangent and normal; angle between curves; orthogonal curves.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Monotonicity and Extrema',
      'Increasing and decreasing functions; critical points; first and second derivative tests; absolute maximum and minimum; optimisation problems.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Mean Value Theorems',
      'Rolle''s theorem; Lagrange''s mean value theorem (LMVT); Cauchy''s MVT; applications; geometrical interpretation.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 10. Integral Calculus
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (math_id, 'Integral Calculus', ARRAY['JEE']::exam_type[], 10, 10.0,
            'Indefinite and definite integration, methods, area under curves')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, math_id, 'Indefinite Integration',
      'Standard integral forms; integration by substitution; integration by parts (ILATE); integration by partial fractions; integrals of special forms.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Definite Integration',
      'Fundamental theorem of calculus; properties of definite integrals (king property, etc.); definite integral as limit of sum; reduction formulas.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Area Under Curves',
      'Area between curve and x-axis; area between two curves; area using horizontal strips; area of standard curves (ellipse, parabola).',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 11. Differential Equations
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (math_id, 'Differential Equations', ARRAY['JEE']::exam_type[], 11, 3.33,
            'Order, degree, variable separable, homogeneous, linear DE')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, math_id, 'Formation and Variable Separable Method',
      'Order and degree of DE; formation from given solution; variable separable DE; solving first-order DEs; applications (growth/decay, cooling).',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Homogeneous and Linear Differential Equations',
      'Homogeneous DE (y = vx substitution); linear first-order DE (integrating factor method dy/dx + Py = Q); Bernoulli equations.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 12. Straight Lines
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (math_id, 'Coordinate Geometry — Straight Lines', ARRAY['JEE']::exam_type[], 12, 3.33,
            'Slope, equations of lines, angle, distance, family of lines')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, math_id, 'Slope and Equations of Line',
      'Slope of line; various forms (point-slope, intercept, normal, two-point, symmetric); distance of point from line; foot of perpendicular.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Angle Between Lines and Concurrent Lines',
      'Angle between two lines; condition for parallel and perpendicular lines; family of concurrent lines; condition for concurrency; locus problems.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Position of Points and Angle Bisectors',
      'Position of point relative to line; angle bisectors of two lines; internal/external bisectors; bisectors of sides of triangle.',
      'Medium', ARRAY['JEE']::exam_type[]);

  -- 13. Circles
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (math_id, 'Coordinate Geometry — Circles', ARRAY['JEE']::exam_type[], 13, 3.33,
            'Equations, tangents, chords, family of circles')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, math_id, 'Standard Equations and Properties of Circle',
      'Standard form (x-h)² + (y-k)² = r²; general form; diametrically opposite points; position of point w.r.t. circle.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Tangent and Normal to a Circle',
      'Condition for tangency; equation of tangent at a point; tangent from external point; length of tangent; chord of contact; director circle.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Family of Circles and Radical Axis',
      'Family of circles (through intersection of two circles); radical axis and radical centre; coaxial circles; orthogonal circles.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 14. Conic Sections
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (math_id, 'Conic Sections', ARRAY['JEE']::exam_type[], 14, 6.67,
            'Parabola, ellipse, hyperbola: standard forms, focal properties, tangents, normals')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, math_id, 'Parabola',
      'Standard forms y² = 4ax; focus, directrix, axis, latus rectum; parametric form; tangent and normal; focal chord properties; chord of contact.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Ellipse',
      'Standard form x²/a² + y²/b² = 1; eccentricity; foci, vertices, directrices, latus rectum; parametric equations; tangent and normal; auxiliary circle.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Hyperbola',
      'Standard form x²/a² - y²/b² = 1; eccentricity; asymptotes; conjugate hyperbola; rectangular hyperbola (xy = c²); tangent and normal.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 15. Three Dimensional Geometry
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (math_id, 'Three Dimensional Geometry', ARRAY['JEE']::exam_type[], 15, 6.67,
            'Direction cosines, line, plane, distance, angle, skew lines')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, math_id, 'Direction Cosines and Direction Ratios',
      'Direction cosines l, m, n; direction ratios; relation l² + m² + n² = 1; angle between two lines using DCs; projection of segment.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Equation of Line in 3D',
      'Vector and Cartesian forms of line; angle between lines; foot of perpendicular; distance from point to line; skew lines; shortest distance.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Equation of Plane',
      'Normal form, intercept form, three-point form; angle between planes; line and plane angle; foot of perpendicular from point to plane; distance formula.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Coplanarity and Sphere',
      'Condition for four points to be coplanar; equation of sphere; intersection of sphere and line; power of a point.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 16. Vectors
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (math_id, 'Vector Algebra', ARRAY['JEE']::exam_type[], 16, 6.67,
            'Vector operations, dot product, cross product, triple products, applications')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, math_id, 'Vectors and Vector Algebra',
      'Types of vectors; addition and subtraction; scalar multiplication; unit vector; position vector; section formula in 3D.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Dot Product (Scalar Product)',
      'Definition and formula; projection of vector; angle between vectors; work done; geometrical applications; vector equations of conic sections.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Cross Product (Vector Product)',
      'Definition; magnitude and direction; area of parallelogram and triangle; torque; angular momentum; vector area; Lagrange identity.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Scalar and Vector Triple Products',
      'Scalar triple product [a b c] = a·(b×c); volume of parallelepiped; coplanarity condition; vector triple product; linear dependence.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 17. Probability and Statistics
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (math_id, 'Statistics and Probability', ARRAY['JEE']::exam_type[], 17, 6.67,
            'Measures of dispersion, probability, conditional, Bayes, binomial distribution')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, math_id, 'Statistics: Measures of Dispersion',
      'Mean, median, mode; range; mean deviation; variance; standard deviation; coefficient of variation; relation between measures.',
      'Easy', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Probability: Classical and Axiomatic',
      'Sample space and events; classical definition; addition theorem; conditional probability; multiplication theorem; independent events.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Bayes'' Theorem and Total Probability',
      'Partition of sample space; law of total probability; Bayes'' theorem; prior and posterior probability; applications.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Random Variables and Binomial Distribution',
      'Discrete random variable; probability distribution; mean and variance; Bernoulli trials; binomial distribution B(n, p); mean = np, variance = npq.',
      'Hard', ARRAY['JEE']::exam_type[]);

  -- 18. Trigonometry
  INSERT INTO chapters (subject_id, name, exam_types, chapter_number, weightage_percent, description)
    VALUES (math_id, 'Trigonometry', ARRAY['JEE']::exam_type[], 18, 6.67,
            'Ratios, identities, inverse trig, properties of triangles, equations')
    RETURNING id INTO ch;
  INSERT INTO concepts (chapter_id, subject_id, name, description, difficulty_level, exam_relevance) VALUES
    (ch, math_id, 'Trigonometric Ratios and Identities',
      'Definitions; sign in quadrants; allied angles; compound angle formulas; multiple and sub-multiple angles; product-to-sum and sum-to-product.',
      'Medium', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Inverse Trigonometric Functions',
      'Domain and range; principal values; graphs; properties and identities (sin⁻¹x + cos⁻¹x = π/2, etc.); simplification; composition.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Properties of Triangles',
      'Sine rule; cosine rule; projection formula; area of triangle; in-radius; circumradius; ex-radii; half-angle formulas.',
      'Hard', ARRAY['JEE']::exam_type[]),
    (ch, math_id, 'Trigonometric Equations',
      'General solutions of sinθ = k, cosθ = k, tanθ = k; equations of the form a cosθ + b sinθ = c; principal and general solutions.',
      'Hard', ARRAY['JEE']::exam_type[]);

  RAISE NOTICE 'JEE syllabus seeded successfully.';

END $$;
