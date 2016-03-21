Alm
===

(c) 2016 Gatlin Johnson <gatlin@niltag.net>

0. Synopsis
---

See `example/` for a simple TODO application. It is currently [live
here](http://niltag.net/almtest).

1. What?
---

This is a functional reactive browser application toolkit. It places an
emphasis on correctness and straightforward implementation.

### Background

Functional reactive programming (**FRP**) is really cool. [Elm][elm] is also
really cool, because it is an effective, elegant, and practical execution of
those ideas.

However, it's not JavaScript. I want to take advantage of FRP -- and in
particular, Elm's interpretation of it -- in native JavaScript. So I
re-implemented the same core ideas as this library.

The name is a reference not only to [Elm][elm] but to the idea of *alms*,
charity given to the poor and needy. I think Elm has really contributed some
innovative ideas and practical code to a space which sorely needed it.

### How?

An `App` is a state monad contanining a runtime object. It binds itself to a
particular top-level DOM element and exposes events and message dispatching
capabilities to your application inside a contained, protected context using
the magic of scoping and monad bullshit.

You create signals by mapping, filtering, or reducing events from the top level
event sources, or from `mailbox`es which you can create, or from `ports` which
allow the application to communicate with the wider browser context.

Really, have a crack at the `alm.js` code and the `example` directory. It's
surprisingly short for how much it does and is commented thoroughly.

Obviously a clever or insufferable person can find ways to get around the
safeguards of this library, though this then begs the question of why you would
use it in the first place.

2. Status

THIS IS NOT READY FOR PRIMETIME DON'T YOU EVEN THINK ABOUT USING THIS SOME
PLACE IMPORTANT AND THEN GETTING MAD NOPE DON'T EVEN.

3. LICENSE
---

See the included `LICENSE` file.

4. Questions / comments / bugs / free money
---

Send all inquiries to <gatlin@niltag.net>, except bugs. Bugs should be
submitted using the GitHub Issues feature.

[elm]: http://elm-lang.org
